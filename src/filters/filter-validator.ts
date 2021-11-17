import { Filters } from './filters'
import { Operators } from './operators'

export class FilterValidator {
    private allowedResources: string[] = [
      '^attachments$',
      '^volume-age$',
      '^cpu$',
      '^network-in$',
      '^network-out$',
      '^launch-time$',
      '^instance-ids$',
      '^dns-name$',
      '^database-connections$',
      '^instances$',
      '^association-ids$',
      '^tag:.{1,128}$'
    ]

    public validate (filters: Filters) {
      if (!filters.and) {
        throw new Error('Filter validation failed : The root element must either be `and` or `or`')
      }

      filters.and.forEach(filter => {
        const resourceValidation = this.allowedResources.some(u => {
          const regexp = new RegExp(u)
          return regexp.test(filter.resource)
        })

        if (!resourceValidation) {
          throw new Error(`Filter validation failed : ${filter.resource} is not allowed resource`)
        }
        if (typeof (Operators as any)[filter.op] === 'undefined') {
          throw new Error(`Filter validation failed : ${filter.op} is not allowed operator for ${filter.resource} resource`)
        }
      })
    }
}
