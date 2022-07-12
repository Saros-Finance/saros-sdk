import * as sarosSdk from './swap';
import * as sarosService from './common';
import * as sarosFunction from './functions';
import * as sarosFarm from './farm';
import * as sarosStake from './stake';

export default {
  ...sarosSdk,
  ...sarosService,
  ...sarosFunction,
  ...sarosFarm,
  ...sarosStake,
};
