import * as sarosSdk from './swap';
import * as sarosService from './common';
import * as sarosFunction from './functions';
import * as sarosFarm from './farm';

export default { ...sarosSdk, ...sarosService, ...sarosFunction, ...sarosFarm };
