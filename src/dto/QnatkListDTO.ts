export interface QnatkListDTO {
  modelOptions: ModelOptions;
  pagination: Pagination;
  customOptions?: any; // You can add any additional custom options here
}

interface ModelOptions {
  attributes?: string[] | object; // You can specify attributes as an array or an object
  include?: Include[] | object; // Include can be an array of Include objects or an object
  where?: any; // Define conditions here
  order?: string | string[]; // Define sorting order here
  limit?: number;
  offset?: number;
}

interface Include {
  model: string;
  attributes?: string[] | object;
  where?: any;
  required?: boolean;
  duplicating?: boolean;
}

interface Pagination {
  page: number;
  rowsPerPage: number;
  sortBy: string;
  descending: boolean;
  rowsNumber: number;
}
