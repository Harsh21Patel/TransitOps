/**
 * Utility class to build Mongoose queries with advanced filtering, sorting, pagination, and searching.
 */
class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.page = 1;
    this.limit = 10;
    this.countQuery = null;
  }

  /**
   * Performs partial text searching on specified fields using the `search` query parameter.
   * @param {string[]} fields - Schema fields to check (performs OR match)
   */
  search(fields) {
    if (this.queryString.search && fields && fields.length > 0) {
      const searchRegex = new RegExp(this.queryString.search, 'i');
      const searchFilter = {
        $or: fields.map((field) => ({ [field]: searchRegex })),
      };
      this.query = this.query.find(searchFilter);
    }
    return this;
  }

  /**
   * Filters the query on allowed fields from the query parameters, ignoring page/sort/limit.
   * @param {string[]} allowedFields - Fields allowed to be filtered on
   */
  filter(allowedFields) {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach((el) => delete queryObj[el]);

    const filterObj = {};
    if (allowedFields && allowedFields.length > 0) {
      allowedFields.forEach((field) => {
        if (queryObj[field] !== undefined && queryObj[field] !== '') {
          // If the query filter value is an array or object, pass it; otherwise simple matches
          filterObj[field] = queryObj[field];
        }
      });
    } else {
      Object.assign(filterObj, queryObj);
    }

    this.query = this.query.find(filterObj);
    return this;
  }

  /**
   * Sorts the query using the `sort` query parameter. Defaults to `-createdAt`.
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * Paginate the query using `page` and `limit`. Also builds `countQuery` before applying limits.
   */
  paginate() {
    this.page = Number(this.queryString.page) || 1;
    this.limit = Number(this.queryString.limit) || 10;
    const skip = (this.page - 1) * this.limit;

    // Use clone to create a count query that has all filter/search options applied
    // but without the skip and limit pagination options.
    this.countQuery = this.query.clone().countDocuments();

    this.query = this.query.skip(skip).limit(this.limit);
    return this;
  }
}

module.exports = ApiFeatures;
