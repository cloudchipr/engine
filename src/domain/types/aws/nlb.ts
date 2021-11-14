import { Elb } from './elb'

export class Nlb extends Elb {
    // NLB has different DNS structure
    protected readonly REGION_FETCH_REGEXP = /.*\.elb\.(.*)\.amazonaws\.com/;
}
