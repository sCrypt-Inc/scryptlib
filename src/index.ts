import { version } from '../package.json';
import { getContractClass } from './contract';
import { compile } from './compiler';

const Scrypt = {
  version,
  getContractClass,
  compile
};

export default Scrypt;