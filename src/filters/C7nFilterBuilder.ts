import { FilterBuilderInterface } from "../FilterBuilderInterface";
import { FilterList } from "./FilterList";
import { FilterExpression } from "./FilterExpression";
import { Operators } from "./Operators";

export class C7nFilterBuilder implements FilterBuilderInterface {
  validate(expression: FilterExpression): boolean {
    return true;
  }

  buildFilter(filterList: FilterList): object {
    const filterResponse: any = {};

    for (const filter of filterList.andList) {
      if (!filterResponse.hasOwnProperty("and")) {
        filterResponse.and = [];
      }

      filterResponse.and.push(filter.build());
    }

    for (const filter of filterList.orList) {
      if (!filterResponse.hasOwnProperty("or")) {
        filterResponse.or = [];
      }

      filterResponse.or.push(filter.build());
    }

    return filterResponse;
  }

  buildFilterExpression(expression: FilterExpression): object {
    if (expression.operator === Operators.IsEmpty) {
      return {
        [expression.resource]: [],
      };
    }

    switch (expression.resource) {
      case "volume-age":
        return C7nFilterBuilder.buildVolumeAge(expression);
      default:
        return {
          key: expression.resource,
          op: expression.operator,
          value: expression.value,
        };
    }
  }

  private static buildVolumeAge(expression: FilterExpression): object {
    return {
      type: "value",
      key: "CreateTime",
      op: expression.operator,
      value_type: "age",
      value: expression.value,
    };
  }
}
