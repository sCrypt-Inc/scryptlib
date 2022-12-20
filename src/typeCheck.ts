import { Argument, Arguments, isArrayType, isGenericType, LibraryEntity, ParamEntity, parseGenericType, StructEntity } from '.';
import { parseLiteral, subscript, toGenericType } from './internal';
import { isBytes, ScryptType, StructObject, SupportedParamType, SymbolType, TypeResolver } from './scryptTypes';



export function typeOfArg(a: SupportedParamType): string {
  if (typeof a === 'bigint') {
    return 'int';
  } else if (typeof a === 'boolean') {
    return 'bool';
  } else if (typeof a === 'string') {
    return 'bytes';
  } else if (Array.isArray(a)) {
    return 'Array';
  } else {
    return typeof a;
  }
}



/**
 * return eg. int[N][N][4] => ['int', ["N","N","4"]]
 * @param arrayTypeName 
 */
export function arrayTypeAndSizeStr(arrayTypeName: string): [string, Array<string>] {

  const arraySizes: Array<string> = [];


  if (arrayTypeName.indexOf('>') > -1) {
    const elemTypeName = arrayTypeName.substring(0, arrayTypeName.lastIndexOf('>') + 1);
    const sizeParts = arrayTypeName.substring(arrayTypeName.lastIndexOf('>') + 1);

    [...sizeParts.matchAll(/\[([\w.]+)\]+/g)].map(match => {
      arraySizes.push(match[1]);
    });

    return [elemTypeName, arraySizes];
  }
  [...arrayTypeName.matchAll(/\[([\w.]+)\]+/g)].map(match => {
    arraySizes.push(match[1]);
  });

  const group = arrayTypeName.split('[');
  const elemTypeName = group[0];
  return [elemTypeName, arraySizes];
}

/**
 * return eg. int[2][3][4] => ['int', [2,3,4]]
 * @param arrayTypeName  eg. int[2][3][4]
 */
export function arrayTypeAndSize(arrayTypeName: string): [string, Array<number>] {
  const [elemTypeName, arraySizes] = arrayTypeAndSizeStr(arrayTypeName);
  return [elemTypeName, arraySizes.map(size => {
    const n = parseInt(size);

    if (isNaN(n)) {
      throw new Error(`arrayTypeAndSize error type ${arrayTypeName} with sub isNaN`);
    }

    return n;
  })];
}

export function toLiteralArrayType(elemTypeName: string, sizes: Array<number | string>): string {
  return [elemTypeName, sizes.map(size => `[${size}]`).join('')].join('');
}


/**
 * return eg. int[2][3][4] => int[3][4]
 * @param arrayTypeName  eg. int[2][3][4]
 */
export function subArrayType(arrayTypeName: string): string {
  const [elemTypeName, sizes] = arrayTypeAndSize(arrayTypeName);
  return toLiteralArrayType(elemTypeName, sizes.slice(1));
}



function checkArrayParamType(args: SupportedParamType[], param: ParamEntity, resolver: TypeResolver): Error | undefined {
  const typeInfo = resolver(param.type);

  const expectedType = typeInfo.finalType;
  const [elemTypeName, arraySizes] = arrayTypeAndSize(expectedType);

  if (!Array.isArray(args)) {
    return new Error(`The type of ${param.name} is wrong, expected ${expectedType} but got ${typeOfArg(args)}`);
  }

  if (args.length !== arraySizes[0]) {
    return new Error(`The type of ${param.name} is wrong, expected a array with length = ${arraySizes[0]} but got a array with length = ${args.length} `);
  }

  if (arraySizes.length == 1) {
    return args.map(arg => {
      return checkSupportedParamType(arg, {
        name: param.name,
        type: elemTypeName
      }, resolver);
    }).find(e => e instanceof Error);
  } else {
    return args.map(a => {
      return checkArrayParamType(a as SupportedParamType[], {
        name: param.name,
        type: subArrayType(expectedType)
      }, resolver);
    }).find(e => e instanceof Error);
  }
}




function checkStructParamType(arg: StructObject, param: ParamEntity, resolver: TypeResolver): Error | undefined {
  const typeInfo = resolver(param.type);
  if (!typeInfo.info) {
    return new Error(`The type of ${param.name} is wrong, no info found`);
  }

  let entity = typeInfo.info as StructEntity;

  if (typeInfo.generic) {
    const result = deduceGenericStruct(param, entity, resolver);

    if (result instanceof Error) {
      return result;
    }

    entity = result as StructEntity;
  }


  if (Array.isArray(arg)) {
    return new Error(`The type of ${param.name} is wrong, expected ${entity.name} but got a array`);
  }

  if (typeof arg !== 'object') {
    return new Error(`The type of ${param.name} is wrong, expected ${entity.name} but got a ${typeof arg}`);
  }

  const error = entity.params.map(p => {
    if (!Object.keys(arg).includes(p.name)) {
      return new Error(`The type of ${param.name} is wrong, expected ${entity.name} but missing member [${p.name}]`);
    }
    return checkSupportedParamType(arg[p.name], p, resolver);
  }).find(e => e instanceof Error);

  if (error) {
    return error;
  }

  const members = entity.params.map(p => p.name);

  return Object.keys(arg).map(key => {
    if (!members.includes(key)) {
      return new Error(`The type of ${param.name} is wrong, expected ${entity.name} but redundant member [${key}] appears`);
    }
    return undefined;
  }).find(e => e instanceof Error);

}




function checkLibraryParamType(args: SupportedParamType[], param: ParamEntity, resolver: TypeResolver): Error | undefined {
  const typeInfo = resolver(param.type);
  if (!typeInfo.info || typeInfo.symbolType !== SymbolType.Library) {
    return new Error(`The type of ${param.name} is wrong, no info found`);
  }

  let entity = typeInfo.info as LibraryEntity;


  if (typeInfo.generic) {
    const result = deduceGenericLibrary(param, entity, resolver);

    if (result instanceof Error) {
      return result;
    }

    entity = result as LibraryEntity;
  }

  if (Array.isArray(args)) {

    if (args.length !== entity.params.length) {
      return new Error(`The type of ${param.name} is wrong, expected a array with length = ${entity.params.length} but got a array with length = ${args.length} `);
    }

    return entity.params.map((p, index) => {
      if (typeof args[index] === 'undefined') {
        return new Error(`The type of ${param.name} is wrong, expected ${entity.name} but missing parameter [${p.name}]`);
      }

      return checkSupportedParamType(args[index], p, resolver);
    }).find(e => e instanceof Error);
  } else if (typeof args === 'object') {

    return entity.properties.map((p) => {
      if (typeof args[p.name] === 'undefined') {
        return new Error(`The type of ${param.name} is wrong, expected ${entity.name} but missing property [${p.name}]`);
      }

      return checkSupportedParamType(args[p.name], p, resolver);
    }).find(e => e instanceof Error);
  } else {
    return new Error(`The type of ${param.name} is wrong, expected a array or a object but got ${typeof args}`);
  }
}


export function checkSupportedParamType(arg: SupportedParamType, param: ParamEntity, resolver: TypeResolver): Error | undefined {
  const typeInfo = resolver(param.type);
  const expectedType = typeInfo.finalType;

  if (isArrayType(expectedType)) {
    return checkArrayParamType(arg as SupportedParamType[], param, resolver);
  } else if (typeInfo.symbolType === SymbolType.Struct) {
    return checkStructParamType(arg as StructObject, param, resolver);
  } else if (typeInfo.symbolType === SymbolType.Library) {
    return checkLibraryParamType(arg as SupportedParamType[], param, resolver);
  } else if (typeInfo.symbolType === SymbolType.ScryptType) {
    const error = new Error(`The type of ${param.name} is wrong, expected ${expectedType} but got ${typeOfArg(arg)}`);
    const t = typeOfArg(arg);
    if (isBytes(expectedType)) {
      return t === ScryptType.BYTES ? undefined : error;
    } else if (expectedType === ScryptType.PRIVKEY) {
      return t === 'int' ? undefined : error;
    } else {
      return t == expectedType ? undefined : error;
    }

  } else {
    return new Error(`can't not resolve type: ${param.type}`);
  }
}

function hasGeneric(entity: StructEntity | LibraryEntity): boolean {
  return entity.genericTypes.length > 0;
}

function isGenericParamType(entity: StructEntity | LibraryEntity, t: string): boolean {
  return entity.genericTypes.includes(t);
}

class GenericDeducer {
  private inferred: Record<string, string> = {};

  constructor(public entity: StructEntity | LibraryEntity, public resolver: TypeResolver) {

  }

  private resolve(type: string): string {
    if (Object.keys(this.inferred).length > 0) {
      if (isGenericType(type)) {
        const [name, types] = parseGenericType(type);
        return toGenericType(name, types.map(t => this.inferred[t] || t));
      }

      if (isArrayType(type)) {
        const [elem, sizes] = arrayTypeAndSizeStr(type);
        return toLiteralArrayType(elem, sizes.map(t => this.inferred[t] || t));
      }

      return this.inferred[type] || type;
    }

    return type;
  }

  inferr(param: ParamEntity): Error | undefined {

    const typeInfo = this.resolver(param.type);
    const [name, genericTypes] = parseGenericType(typeInfo.finalType);

    if (this.entity.name !== name) {
      return new Error(`Generic inference failed, expected ${name} but got ${this.entity.name}`);
    }

    if (this.entity.genericTypes.length !== genericTypes.length) {
      return new Error('Generic inference failed, genericTypes length not match');
    }

    return this.entity.genericTypes.map((genericTyp, index) => {
      const realType = genericTypes[index];
      return this.assert(genericTyp, realType);
    }).find(e => e instanceof Error);
  }

  getEntity(): StructEntity | LibraryEntity {




    if (Object.prototype.hasOwnProperty.call(this.entity, 'properties')) {
      const library = this.entity as LibraryEntity;

      return {
        name: library.name,
        params: library.params.map(p => ({
          name: p.name,
          type: this.resolve(p.type)
        })),
        properties: library.properties.map(p => ({
          name: p.name,
          type: this.resolve(p.type)
        })),
        genericTypes: (this.entity.genericTypes || []).map(t => this.resolve(t))
      };

    }


    return {
      name: this.entity.name,
      params: this.entity.params.map(p => ({
        name: p.name,
        type: this.resolve(p.type)
      })),
      genericTypes: (this.entity.genericTypes || []).map(t => this.resolve(t))
    };

  }

  private assert(genericType: string, realType: string): Error | undefined {
    if (this.inferred[genericType]) {
      if (this.inferred[genericType] !== realType) {
        return new Error(`Generic inference failed, generic ${genericType} cannot be both type ${this.inferred[genericType]} and type ${realType}`);
      }
    } else {
      this.inferred[genericType] = realType;
    }
  }
}

export function deduceGenericStruct(param: ParamEntity, entity: StructEntity, resolver: TypeResolver): StructEntity | LibraryEntity | Error {

  if (!hasGeneric(entity)) {
    return new Error(`struct ${entity.name} does not has any generic type`);
  }

  const deducer = new GenericDeducer(entity, resolver);
  const error = deducer.inferr(param);
  if (error) {
    return error;
  }

  return deducer.getEntity();
}

export function deduceGenericLibrary(param: ParamEntity, entity: LibraryEntity, resolver: TypeResolver): LibraryEntity | Error {

  if (!hasGeneric(entity)) {
    return new Error(`library ${entity.name} does not has any generic type`);
  }

  const deducer = new GenericDeducer(entity, resolver);
  const error = deducer.inferr(param);
  if (error) {
    return error;
  }

  return deducer.getEntity() as LibraryEntity;
}





function flatternArray(arg: SupportedParamType[], param: ParamEntity, resolver: TypeResolver, options: FlatOptions): Arguments {


  const [elemTypeName, arraySizes] = arrayTypeAndSize(param.type);

  const typeInfo = resolver(elemTypeName);


  if (!options.ignoreValue) {

    if (!Array.isArray(arg)) {
      throw new Error('flatternArray only work with array');
    }

    if (arg.length != arraySizes[0]) {
      throw new Error(`Array length not match, expected ${arraySizes[0]} but got ${arg.length}`);
    }
  }


  return new Array(arraySizes[0]).fill(1).flatMap((_, index) => {
    const item = options.ignoreValue ? undefined : arg[index];
    if (arraySizes.length > 1) {
      return flatternArg({
        name: `${param.name}[${index}]`,
        type: subArrayType(param.type),
        value: item
      }, resolver, options);
    } else if (typeInfo.symbolType === SymbolType.Struct) {
      return flatternArg({
        name: `${param.name}[${index}]`,
        type: elemTypeName,
        value: item
      }, resolver, options);
    } else if (typeInfo.symbolType === SymbolType.Library) {
      return flatternArg({
        name: `${param.name}[${index}]`,
        type: elemTypeName,
        value: item
      }, resolver, options);
    }

    return {
      value: item,
      name: `${param.name}${subscript(index, arraySizes)}`,
      type: elemTypeName
    };
  });
}


function flatternStruct(arg: StructObject | undefined, param: ParamEntity, resolver: TypeResolver, options: FlatOptions): Arguments {

  const typeInfo = resolver(param.type);

  if (!options.ignoreValue) {
    if (typeof arg !== 'object') {
      throw new Error('flatternStruct only work with object');
    }
  }


  let entity = typeInfo.info as StructEntity;

  if (typeInfo.generic) {
    const deducer = new GenericDeducer(entity, resolver);
    const error = deducer.inferr(param);

    if (error) {
      throw error;
    }

    entity = deducer.getEntity();
  }

  return entity.params.flatMap(p => {
    const paramTypeInfo = resolver(p.type);

    const member = options.ignoreValue ? undefined : arg[p.name];
    if (isArrayType(paramTypeInfo.finalType)) {
      return flatternArg({
        name: `${param.name}.${p.name}`,
        type: p.type,
        value: member
      }, resolver, options);
    } else if (paramTypeInfo.symbolType === SymbolType.Struct) {
      return flatternArg({
        name: `${param.name}.${p.name}`,
        type: p.type,
        value: member
      }, resolver, options);
    } else {
      return {
        value: member,
        name: `${param.name}.${p.name}`,
        type: p.type
      };
    }
  });
}


function flatternLibrary(args: SupportedParamType, param: ParamEntity, resolver: TypeResolver, options: FlatOptions): Arguments {

  const typeInfo = resolver(param.type);

  let entity = typeInfo.info as LibraryEntity;


  if (typeInfo.generic) {
    const deducer = new GenericDeducer(entity, resolver);
    const error = deducer.inferr(param);

    if (error) {
      throw error;
    }

    entity = deducer.getEntity() as LibraryEntity;
  }

  if (!options.ignoreValue) {
    if (options.state) {
      if (typeof args !== 'object') {
        throw new Error('only work with object when flat a libray as state');
      }
    } else {
      if (!Array.isArray(args)) {
        throw new Error('only work with array when flat a library');
      }

      if (entity.params.length != args.length) {
        throw new Error(`Array length not match, expected ${entity.params.length} but got ${args.length}`);
      }
    }

  }

  const toflat = options.state ? entity.properties : entity.params;

  return toflat.flatMap((p, index) => {

    const paramTypeInfo = resolver(p.type);
    let arg = options.ignoreValue ? undefined : (options.state ? args[p.name] : args[index]);

    if (!options.ignoreValue && typeof arg === 'undefined' && (entity.name === 'HashedSet' || entity.name === 'HashedMap')) {
      arg = args[0];
    }

    if (isArrayType(paramTypeInfo.finalType)) {
      return flatternArg({
        name: `${param.name}.${p.name}`,
        type: p.type,
        value: arg
      }, resolver, options);
    } else if (paramTypeInfo.symbolType === SymbolType.Struct) {
      return flatternArg({
        name: `${param.name}.${p.name}`,
        type: p.type,
        value: arg
      }, resolver, options);
    } else if (paramTypeInfo.symbolType === SymbolType.Library) {
      return flatternArg({
        name: `${param.name}.${p.name}`,
        type: p.type,
        value: arg
      }, resolver, options);
    } else {
      return {
        value: arg,
        name: `${param.name}.${p.name}`,
        type: p.type
      };
    }
  });
}

export type FlatOptions = {
  state: boolean,
  ignoreValue: boolean
}

export function flatternArg(arg: Argument, resolver: TypeResolver, options: FlatOptions): Arguments {
  const args_: Arguments = [];

  const typeInfo = resolver(arg.type);
  if (isArrayType(typeInfo.finalType)) {
    flatternArray(options.ignoreValue ? undefined : arg.value as SupportedParamType[], {
      name: arg.name,
      type: typeInfo.finalType
    }, resolver, options).forEach(e => {
      args_.push({
        name: e.name,
        type: resolver(e.type).finalType,
        value: e.value
      });
    });

  } else if (typeInfo.symbolType === SymbolType.Struct) {
    flatternStruct(arg.value as StructObject, {
      name: arg.name,
      type: typeInfo.finalType
    }, resolver, options).forEach(e => {
      args_.push({
        name: e.name,
        type: resolver(e.type).finalType,
        value: e.value
      });
    });
  } else if (typeInfo.symbolType === SymbolType.Library) {
    flatternLibrary(arg.value as SupportedParamType[], {
      name: arg.name,
      type: typeInfo.finalType
    }, resolver, options).forEach(e => {
      args_.push({
        name: e.name,
        type: resolver(e.type).finalType,
        value: e.value
      });
    });
  }
  else {
    args_.push({
      name: arg.name,
      type: typeInfo.finalType,
      value: arg.value
    });
  }

  return args_;
}
