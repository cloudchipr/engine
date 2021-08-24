import { FilterInterface } from '../FilterInterface';

export class AWSFilter implements FilterInterface {
  unattached = true;
  volumeAge = '>=7d';
}