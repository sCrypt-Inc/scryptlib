import { version } from '../package.json';
import { getContractClass } from './scryptjs-contract';
import { compile } from './scryptjs-compiler';

const Scrypt = {
  version,
  getContractClass,
  compile
};

export default Scrypt;