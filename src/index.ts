import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';

export type AuthMethod = 'bearer' | 'api-key';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;
export type RequestBody = string | Record<string, unknown> | unknown[] | null;
export type Headers = Record<string, string | string[] | undefined>;

export interface ClientOptions {
  base_url?: string;
  timeout?: number;
  token?: string | null;
  auth_method?: AuthMethod;
}

export interface SearchParams {
  q?: string;
  query?: { q?: string; query_by?: string | string[]; [key: string]: unknown };
  query_by?: string | string[];
  from?: number;
  size?: number;
  offset?: number;
  limit?: number;
  page?: number;
  per_page?: number;
  filter_by?: string;
  filter?: string | Record<string, unknown>;
  sort?: string | Array<string | Record<string, 'asc' | 'desc' | string>>;
  sort_by?: string | string[];
  facet_by?: string | string[];
  facets?: string | string[];
  typo_tolerance?: boolean | number;
  num_typos?: number;
  highlight?: boolean | string;
  highlight_fields?: string | string[];
  highlight_full_fields?: string | string[];
  body?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VectorSearchParams extends SearchParams {
  vector_query?: number[] | string;
  vectorQuery?: number[] | Record<string, unknown> | string;
  vector?: number[] | string;
  embedding?: number[] | string;
  field_name?: string;
  field?: string;
  fieldName?: string;
  topk?: number;
  top_k?: number;
  topK?: number;
  k?: number;
  threshold?: number;
  normalize?: boolean;
  output_fields?: string | string[];
  outputFields?: string | string[];
  include_vector?: boolean;
  includeVector?: boolean;
  include_distance?: boolean;
  includeDistance?: boolean;
  filterBy?: string;
  radius?: number;
  max_distance?: number;
  maxDistance?: number;
  range_filter?: string;
  rangeFilter?: string;
  min_distance?: number;
  minDistance?: number;
  query_params?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  params?: Record<string, unknown>;
  vector_queries?: unknown[];
  vectorQueries?: unknown[];
}

export interface CollectionSchema {
  fields?: Array<Record<string, unknown>>;
  searchable_fields?: string[];
  filterable_fields?: string[];
  sortable_fields?: string[];
  [key: string]: unknown;
}

export interface DocumentFields {
  id?: string | number;
  [key: string]: unknown;
}

export class HlqueryException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HlqueryException';
  }
}

export class AuthenticationException extends HlqueryException {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationException';
  }
}

export class RequestException extends HlqueryException {
  constructor(
    message: string,
    public readonly statusCode = 0,
    public readonly responseBody: unknown = null
  ) {
    super(message);
    this.name = 'RequestException';
  }
}

export class ValidationException extends HlqueryException {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationException';
  }
}

export class CollectionException extends HlqueryException {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionException';
  }
}

export class DocumentException extends HlqueryException {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentException';
  }
}

export class SearchException extends HlqueryException {
  constructor(message: string) {
    super(message);
    this.name = 'SearchException';
  }
}

export class DemoModeException extends HlqueryException {
  constructor(message: string) {
    super(message);
    this.name = 'DemoModeException';
  }
}

export class Response<T = unknown> {
  constructor(
    private readonly statusCode: number,
    private readonly body: T,
    private readonly headers: Headers = {}
  ) {}

  getStatusCode(): number {
    return this.statusCode;
  }

  getBody(): T {
    return this.body;
  }

  getHeaders(): Headers {
    return this.headers;
  }

  isSuccess(): boolean {
    return this.statusCode >= 200 && this.statusCode < 300;
  }

  isError(): boolean {
    return this.statusCode >= 400;
  }

  getError(): string | null {
    if (!this.isError() || typeof this.body !== 'object' || this.body === null) {
      return null;
    }
    const body = this.body as Record<string, unknown>;
    return String(body.error || body.message || 'Unknown error');
  }

  toArray(): { status: number; body: T } {
    return { status: this.statusCode, body: this.body };
  }
}

export class Config {
  static getDefaultBaseUrl(): string {
    return process.env.HLQ_BASE_URL || process.env.HLQUERY_BASE_URL || 'http://localhost:9200';
  }

  static mergeDefaults(options: ClientOptions = {}): Required<ClientOptions> {
    return {
      base_url: options.base_url || Config.getDefaultBaseUrl(),
      timeout: options.timeout || 30000,
      token: options.token || null,
      auth_method: options.auth_method || 'bearer',
    };
  }

  static normalizeUrl(url?: string | null): string {
    let normalized = (url || Config.getDefaultBaseUrl()).trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `http://${normalized}`;
    }
    return normalized.replace(/\/$/, '');
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

export class Validator {
  static validateCollectionName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationException('Collection name must be a non-empty string');
    }
    if (name.length > 64) {
      throw new ValidationException('Collection name must be between 1 and 64 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new ValidationException('Collection name contains invalid characters. Use only letters, numbers, underscores, and hyphens');
    }
    if (!/[a-zA-Z_]/.test(name[0])) {
      throw new ValidationException('Collection name must start with a letter or underscore');
    }
  }

  static validateDocumentId(id: string | number): void {
    if (id === null || id === undefined || (typeof id !== 'string' && typeof id !== 'number')) {
      throw new ValidationException('Document ID must be a non-empty string or number');
    }
    const value = String(id);
    if (value.length === 0 || value.length > 64) {
      throw new ValidationException('Document ID must be between 1 and 64 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      throw new ValidationException('Document ID contains invalid characters. Use only letters, numbers, underscores, and hyphens');
    }
  }

  static validatePagination(offset?: number, limit?: number): void {
    if (offset !== undefined && (!Number.isFinite(offset) || offset < 0)) {
      throw new ValidationException('Offset must be a non-negative number');
    }
    if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
      throw new ValidationException('Limit must be a positive number');
    }
  }

  static validateSearchParams(params?: Record<string, unknown>): void {
    if (params && (typeof params !== 'object' || Array.isArray(params))) {
      throw new ValidationException('Search parameters must be an object');
    }
    if (!params) return;
    Validator.validatePagination(params.offset as number | undefined, params.limit as number | undefined);
    Validator.validatePagination(params.from as number | undefined, params.size as number | undefined);
  }

  static validateDocumentFields(document: unknown): void {
    if (!document || typeof document !== 'object' || Array.isArray(document)) return;
    for (const [key, value] of Object.entries(document)) {
      if (key === 'id') continue;
      if (typeof value === 'string' && value.includes(',')) {
        throw new ValidationException(`Field '${key}' contains invalid character: comma (,). Commas are not allowed in field values.`);
      }
      if (Array.isArray(value) && value.some((item) => typeof item === 'string' && item.includes(','))) {
        throw new ValidationException(`Field '${key}' contains invalid character: comma (,). Array items cannot contain commas.`);
      }
    }
  }
}

function encode(value: string | number): string {
  return encodeURIComponent(String(value));
}

function copyDefined(source: Record<string, unknown>, target: QueryParams, key: string, outputKey = key): void {
  if (source[key] !== undefined && source[key] !== null) {
    target[outputKey] = source[key] as QueryValue;
  }
}

function toCsv(value: unknown): QueryValue {
  return Array.isArray(value) ? value.join(',') : (value as QueryValue);
}

function requireObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

export class Request {
  private baseUrl: string;
  private timeout: number;
  private authToken: string | null;
  private authMethod: AuthMethod;

  constructor(baseUrl: string, timeout = 30000, authToken: string | null = null, authMethod: AuthMethod = 'bearer') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
    this.authToken = authToken;
    this.authMethod = authMethod;
  }

  setAuthToken(token: string, method: AuthMethod = 'bearer'): void {
    this.authToken = token;
    this.authMethod = method;
  }

  clearAuth(): void {
    this.authToken = null;
  }

  async execute<T = unknown>(method: HttpMethod | string, requestPath: string, body: RequestBody = null, queryParams: QueryParams = {}): Promise<Response<T>> {
    const url = new URL(this.baseUrl + requestPath);
    for (const [key, value] of Object.entries(queryParams)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) url.searchParams.append(key, String(item));
        }
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }

    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let bodyString: string | null = null;
    if (body !== null) {
      bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    if (this.authToken !== null) {
      if (this.authMethod === 'api-key') {
        headers['X-API-Key'] = this.authToken;
      } else {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
    }

    const transport = url.protocol === 'https:' ? https : http;

    return new Promise<Response<T>>((resolve, reject) => {
      const req = transport.request(url, { method, headers, timeout: this.timeout }, (res) => {
        const responseHeaders: Headers = {};
        for (const [key, value] of Object.entries(res.headers)) {
          responseHeaders[key.toLowerCase()] = value;
        }

        let data = '';
        res.on('data', (chunk: Buffer | string) => {
          data += chunk;
        });

        res.on('end', () => {
          let decoded: unknown = null;
          try {
            decoded = data ? JSON.parse(data) : null;
          } catch {
            decoded = data;
          }

          if (res.statusCode === 403 && decoded && typeof decoded === 'object') {
            const payload = decoded as Record<string, unknown>;
            const errorMsg = String(payload.error || payload.message || '');
            if (errorMsg.includes('Demo mode is enabled') || errorMsg.includes('Operation not allowed') || errorMsg.includes('Write operations are not allowed')) {
              reject(new DemoModeException(`Demo mode is enabled on the server. Write operations are blocked. Server message: ${payload.message || payload.error}`));
              return;
            }
            if (errorMsg.includes('Authentication is disabled') || errorMsg.includes('Tokens are not accepted when authentication is disabled')) {
              reject(new AuthenticationException(`Authentication is disabled on the server. Remove the token from your client configuration. Server message: ${payload.message || payload.error}`));
              return;
            }
          }

          resolve(new Response<T>(res.statusCode || 0, decoded as T, responseHeaders));
        });
      });

      req.on('error', (error: Error) => reject(new RequestException(`Request failed: ${error.message}`, 0)));
      req.on('timeout', () => {
        req.destroy();
        reject(new RequestException('Request timeout', 0));
      });
      if (bodyString !== null) req.write(bodyString);
      req.end();
    });
  }
}

export class Collections {
  constructor(private readonly request: Request) {}

  async list(offset = 0, limit = 10): Promise<Response> {
    Validator.validatePagination(offset, limit);
    return this.request.execute('GET', '/collections', null, { offset, limit });
  }

  async get(name: string): Promise<Response> {
    Validator.validateCollectionName(name);
    return this.request.execute('GET', `/collections/${encode(name)}`);
  }

  async create(name: string, schema: CollectionSchema): Promise<Response> {
    Validator.validateCollectionName(name);
    return this.request.execute('POST', '/collections', { name, ...schema });
  }

  async delete(name: string): Promise<Response> {
    Validator.validateCollectionName(name);
    return this.request.execute('DELETE', `/collections/${encode(name)}`);
  }

  async update(name: string, schema: CollectionSchema): Promise<Response> {
    Validator.validateCollectionName(name);
    return this.request.execute('POST', `/collections/${encode(name)}/update`, schema);
  }

  async getFields(name: string): Promise<Response> {
    const response = await this.get(name);
    if (response.getStatusCode() !== 200) return response;

    const body = response.getBody() as Record<string, string[] | undefined>;
    const allFields: string[] = [];
    const fieldTypes: Record<string, string[]> = {};
    for (const [type, fields] of Object.entries({
      searchable: body.searchable_fields,
      filterable: body.filterable_fields,
      sortable: body.sortable_fields,
    })) {
      for (const field of fields || []) {
        if (!allFields.includes(field)) allFields.push(field);
        fieldTypes[field] ||= [];
        fieldTypes[field].push(type);
      }
    }

    const fields = allFields.map((field) => ({ name: field, type: fieldTypes[field].join(', ') }));
    return new Response(200, {
      collection: name,
      fields,
      field_count: fields.length,
      searchable_fields: body.searchable_fields || [],
      filterable_fields: body.filterable_fields || [],
      sortable_fields: body.sortable_fields || [],
    });
  }

  async getLanguage(name: string): Promise<Response> {
    Validator.validateCollectionName(name);
    return this.request.execute('GET', `/collections/${encode(name)}/lang`);
  }
}

export class Documents {
  constructor(private readonly request: Request) {}

  async list(collectionName: string, params: SearchParams = {}): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateSearchParams(params);
    const offset = params.offset ?? params.from ?? 0;
    const limit = params.limit ?? params.size ?? 10;
    return this.request.execute('GET', `/collections/${encode(collectionName)}/documents`, null, { offset, limit });
  }

  async get(collectionName: string, documentId: string | number): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateDocumentId(documentId);
    return this.request.execute('GET', `/collections/${encode(collectionName)}/documents/${encode(documentId)}`);
  }

  async add(collectionName: string, document: DocumentFields): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateDocumentFields(document);
    return this.request.execute('POST', `/collections/${encode(collectionName)}/documents`, document);
  }

  async update(collectionName: string, documentId: string | number, document: DocumentFields): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateDocumentId(documentId);
    Validator.validateDocumentFields(document);
    return this.request.execute('PUT', `/collections/${encode(collectionName)}/documents/${encode(documentId)}`, document);
  }

  async delete(collectionName: string, documentId: string | number): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateDocumentId(documentId);
    return this.request.execute('DELETE', `/collections/${encode(collectionName)}/documents/${encode(documentId)}`);
  }

  async import(collectionName: string, documents: DocumentFields[]): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    for (const document of documents || []) Validator.validateDocumentFields(document);
    return this.request.execute('POST', `/collections/${encode(collectionName)}/documents/import`, { documents });
  }

  async facetCounts(collectionName: string, params: SearchParams = {}): Promise<Response> {
    return this.collectionDocumentQuery(collectionName, 'facet_counts', params);
  }

  async maybe(collectionName: string, params: SearchParams = {}): Promise<Response> {
    return this.collectionDocumentQuery(collectionName, 'maybe', params);
  }

  async context(collectionName: string, documentId: string | number, params: QueryParams = {}): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateDocumentId(documentId);
    requireObject(params, 'Document context params');
    return this.request.execute('GET', `/collections/${encode(collectionName)}/documents/${encode(documentId)}/context`, null, params);
  }

  async export(collectionName: string, params: SearchParams = {}): Promise<Response> {
    return this.collectionDocumentQuery(collectionName, 'export', params);
  }

  async deleteByFilter(collectionName: string, filter: string): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    return this.request.execute('DELETE', `/collections/${encode(collectionName)}/documents`, null, { filter_by: filter });
  }

  async parseCSV(filePath: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const content = await fs.readFile(filePath, 'utf8');
    const rows = content.split(/\r?\n/).filter(Boolean).map((line) => line.split(',').map((cell) => cell.trim()));
    const headers = (options.headers as string[] | undefined) || rows.shift() || [];
    return { path: filePath, headers, rows, row_count: rows.length };
  }

  async addCSV(collectionName: string, filePath: string, options: Record<string, unknown> = {}): Promise<Response> {
    const parsed = await this.parseCSV(filePath, options);
    const documentId = typeof options.id === 'string' || typeof options.id === 'number'
      ? options.id
      : path.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, '_');
    const document = {
      id: documentId,
      title: typeof options.title === 'string' ? options.title : path.basename(filePath),
      text: JSON.stringify(parsed.rows),
      source_path: filePath,
      content_type: 'text/csv',
      metadata: parsed,
    };
    return this.add(collectionName, document);
  }

  async parsePDF(filePath: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const pdfParse = await import('pdf-parse') as unknown as { default?: (buffer: Buffer, options?: Record<string, unknown>) => Promise<Record<string, unknown>> } & ((buffer: Buffer, options?: Record<string, unknown>) => Promise<Record<string, unknown>>);
    const buffer = await fs.readFile(filePath);
    const parsed = await (pdfParse.default || pdfParse)(buffer, options);
    return { path: filePath, text: parsed.text, pages: parsed.numpages, info: parsed.info, metadata: parsed.metadata };
  }

  async addPDF(collectionName: string, filePath: string, options: Record<string, unknown> = {}): Promise<Response> {
    const parsed = await this.parsePDF(filePath, options);
    const documentId = typeof options.id === 'string' || typeof options.id === 'number'
      ? options.id
      : path.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, '_');
    const document = {
      id: documentId,
      title: typeof options.title === 'string' ? options.title : path.basename(filePath),
      text: typeof parsed.text === 'string' ? parsed.text : '',
      source_path: filePath,
      content_type: 'application/pdf',
      metadata: parsed,
    };
    return this.add(collectionName, document);
  }

  private async collectionDocumentQuery(collectionName: string, route: string, params: SearchParams): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateSearchParams(params);
    const method = params.body ? 'POST' : 'GET';
    const body = params.body || (method === 'POST' ? params : null);
    const queryParams = method === 'GET' ? (params as QueryParams) : {};
    return this.request.execute(method, `/collections/${encode(collectionName)}/documents/${route}`, body, queryParams);
  }
}

export class Search {
  constructor(private readonly request: Request, private readonly collections: Collections) {}

  async search(collectionName: string, params: SearchParams = {}): Promise<Response> {
    return this.searchCollection(collectionName, params, false);
  }

  async searchLegacy(collectionName: string, params: SearchParams = {}): Promise<Response> {
    return this.searchCollection(collectionName, params, true);
  }

  async sql(collectionName: string, sql: string, params: QueryParams = {}): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    requireNonEmptyString(sql, 'SQL query');
    requireObject(params, 'SQL params');
    return this.request.execute('GET', `/collections/${encode(collectionName)}/documents/search`, null, { ...params, sql });
  }

  async multiSearch(searches: Array<Record<string, unknown>>): Promise<Response> {
    return this.request.execute('POST', '/multi_search', { searches });
  }

  async globalSearch(params: SearchParams = {}): Promise<Response> {
    Validator.validateSearchParams(params);
    const method = params.body ? 'POST' : 'GET';
    const body = params.body || (method === 'POST' ? params : null);
    const queryParams = method === 'GET' ? (params as QueryParams) : {};
    return this.request.execute(method, '/search', body, queryParams);
  }

  async vectorSearch(collectionName: string, params: VectorSearchParams = {}): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    const queryParams: QueryParams = {};
    const source = params as Record<string, unknown>;
    const vector = params.vector_query ?? params.vectorQuery ?? params.vector ?? params.embedding;
    if (vector !== undefined) queryParams.vector_query = Array.isArray(vector) || typeof vector === 'object' ? JSON.stringify(vector) : String(vector);
    queryParams.field_name = params.field_name || params.field || params.fieldName;
    queryParams.limit = params.limit ?? params.topk ?? params.top_k ?? params.topK ?? params.k ?? params.per_page;
    copyDefined(source, queryParams, 'threshold');
    if (params.normalize !== undefined) queryParams.normalize = params.normalize ? 'true' : 'false';
    if (params.output_fields !== undefined || params.outputFields !== undefined) queryParams.output_fields = toCsv(params.output_fields ?? params.outputFields);
    if (params.include_vector !== undefined || params.includeVector !== undefined) queryParams.include_vector = (params.include_vector ?? params.includeVector) ? 'true' : 'false';
    if (params.include_distance !== undefined || params.includeDistance !== undefined) queryParams.include_distance = (params.include_distance ?? params.includeDistance) ? 'true' : 'false';
    queryParams.filter_by = params.filter_by ?? params.filterBy ?? (typeof params.filter === 'object' ? JSON.stringify(params.filter) : params.filter);
    copyDefined(source, queryParams, 'radius');
    queryParams.max_distance = params.max_distance ?? params.maxDistance;
    queryParams.range_filter = params.range_filter ?? params.rangeFilter;
    queryParams.min_distance = params.min_distance ?? params.minDistance;

    for (const key of Object.keys(queryParams)) {
      if (queryParams[key] === undefined || queryParams[key] === null) delete queryParams[key];
    }

    const forcePost = params.query_params !== undefined || params.queryParams !== undefined || params.params !== undefined || params.vector_queries !== undefined || params.vectorQueries !== undefined;
    const method = params.body || forcePost ? 'POST' : 'GET';
    const body = params.body || (forcePost ? params : null);
    return this.request.execute(method, `/collections/${encode(collectionName)}/vector_search`, body, queryParams);
  }

  private async searchCollection(collectionName: string, params: SearchParams, useLegacyPath: boolean): Promise<Response> {
    Validator.validateCollectionName(collectionName);
    Validator.validateSearchParams(params);

    const queryParams: QueryParams = {};
    if (params.query?.q) queryParams.q = params.query.q;
    if (params.query?.query_by) queryParams.query_by = toCsv(params.query.query_by);
    if (params.q) queryParams.q = params.q;

    if (params.query_by) {
      queryParams.query_by = toCsv(params.query_by);
    } else if (params.q) {
      const collection = await this.collections.get(collectionName);
      const body = collection.getBody() as { searchable_fields?: string[] };
      if (collection.getStatusCode() === 200 && body.searchable_fields?.length) {
        queryParams.query_by = body.searchable_fields.join(',');
      }
    }

    queryParams.offset = params.from ?? params.offset;
    queryParams.limit = params.size ?? params.limit;
    copyDefined(params, queryParams, 'page');
    copyDefined(params, queryParams, 'per_page');
    queryParams.filter_by = params.filter_by ?? (typeof params.filter === 'object' ? JSON.stringify(params.filter) : params.filter);

    if (Array.isArray(params.sort)) {
      queryParams.sort_by = params.sort.map((item) => {
        if (typeof item !== 'object') return item;
        return Object.entries(item).map(([field, order]) => order === 'desc' ? `-${field}` : field).join(',');
      }).join(',');
    } else {
      queryParams.sort_by = params.sort ?? toCsv(params.sort_by);
    }
    queryParams.facet_by = toCsv(params.facet_by ?? params.facets);
    copyDefined(params, queryParams, 'typo_tolerance');
    copyDefined(params, queryParams, 'num_typos');
    if (params.highlight !== undefined) queryParams.highlight = params.highlight === true || params.highlight === 'true' ? 'true' : 'false';
    queryParams.highlight_fields = toCsv(params.highlight_fields);
    queryParams.highlight_full_fields = toCsv(params.highlight_full_fields);

    for (const key of Object.keys(queryParams)) {
      if (queryParams[key] === undefined || queryParams[key] === null) delete queryParams[key];
    }

    const method = params.body ? 'POST' : 'GET';
    const route = useLegacyPath ? 'documents/search' : 'search';
    return this.request.execute(method, `/collections/${encode(collectionName)}/${route}`, params.body || null, queryParams);
  }
}

export class System {
  constructor(private readonly request: Request) {}

  health(): Promise<Response> { return this.request.execute('GET', '/health'); }
  ready(): Promise<Response> { return this.request.execute('GET', '/ready'); }
  status(): Promise<Response> { return this.request.execute('GET', '/status'); }
  query(): Promise<Response> { return this.request.execute('GET', '/query'); }
  startup(): Promise<Response> { return this.request.execute('GET', '/startup'); }
  bootStatus(): Promise<Response> { return this.request.execute('GET', '/boot-status'); }
  info(): Promise<Response> { return this.request.execute('GET', '/'); }
  stats(): Promise<Response> { return this.request.execute('GET', '/stats'); }
  metrics(): Promise<Response> { return this.request.execute('GET', '/metrics'); }
  metricsJson(): Promise<Response> { return this.request.execute('GET', '/metrics.json'); }
  connections(): Promise<Response> { return this.request.execute('GET', '/connections'); }
  rocksdb(): Promise<Response> { return this.request.execute('GET', '/rocksdb'); }
  rocksdbInternal(): Promise<Response> { return this.request.execute('GET', '/_rocksdb'); }
  docTotal(): Promise<Response> { return this.request.execute('GET', '/doctotal'); }
  etc(): Promise<Response> { return this.request.execute('GET', '/etc'); }
  ping(): Promise<Response> { return this.request.execute('GET', '/ping'); }
  integrity(): Promise<Response> { return this.request.execute('GET', '/integrity'); }
  consistency(): Promise<Response> { return this.request.execute('GET', '/consistency'); }
  selfCheck(): Promise<Response> { return this.request.execute('GET', '/self-check'); }
  storageStatus(): Promise<Response> { return this.request.execute('GET', '/admin/storage_status'); }
  searchConfig(): Promise<Response> { return this.request.execute('GET', '/search-config'); }
  updateCounters(params: QueryParams = {}): Promise<Response> { return this.request.execute('GET', '/update-counters', null, params); }
  repair(params: QueryParams = {}): Promise<Response> { return this.request.execute('GET', '/repair', null, params); }
  updateCountersPost(body: Record<string, unknown> = {}): Promise<Response> { return this.request.execute('POST', '/update-counters', body); }
  repairPost(body: Record<string, unknown> = {}): Promise<Response> { return this.request.execute('POST', '/repair', body); }

  async sql(sql: string, params: QueryParams = {}): Promise<Response> {
    requireNonEmptyString(sql, 'SQL query');
    requireObject(params, 'SQL params');
    return this.request.execute('GET', '/sql', null, { ...params, sql });
  }

  async execSql(sql: string): Promise<Response> {
    requireNonEmptyString(sql, 'SQL query');
    return this.request.execute('POST', '/sql', { exec: sql });
  }
}

export class Keys {
  constructor(private readonly request: Request) {}
  list(): Promise<Response> { return this.request.execute('GET', '/keys'); }
  get(id: string): Promise<Response> { requireNonEmptyString(id, 'Key ID'); return this.request.execute('GET', `/keys/${encode(id)}`); }
  create(params: { collections: string[]; actions: string[]; [key: string]: unknown }): Promise<Response> {
    if (!Array.isArray(params.collections)) throw new Error('Collections array is required');
    if (!Array.isArray(params.actions)) throw new Error('Actions array is required');
    return this.request.execute('POST', '/keys', params);
  }
  update(id: string, params: Record<string, unknown>): Promise<Response> { requireNonEmptyString(id, 'Key ID'); return this.request.execute('PUT', `/keys/${encode(id)}`, params); }
  delete(id: string): Promise<Response> { requireNonEmptyString(id, 'Key ID'); return this.request.execute('DELETE', `/keys/${encode(id)}`); }
}

export class Users {
  constructor(private readonly request: Request) {}
  list(): Promise<Response> { return this.request.execute('GET', '/users'); }
  get(id: string): Promise<Response> { requireNonEmptyString(id, 'User ID'); return this.request.execute('GET', `/users/${encode(id)}`); }
  create(params: Record<string, unknown>): Promise<Response> { requireObject(params, 'User params'); return this.request.execute('POST', '/users', params); }
  update(id: string, params: Record<string, unknown>): Promise<Response> { requireNonEmptyString(id, 'User ID'); requireObject(params, 'User params'); return this.request.execute('PUT', `/users/${encode(id)}`, params); }
  delete(id: string): Promise<Response> { requireNonEmptyString(id, 'User ID'); return this.request.execute('DELETE', `/users/${encode(id)}`); }
}

export class Modules {
  constructor(private readonly request: Request) {}
  list(): Promise<Response> { return this.request.execute('GET', '/modules'); }
  syntax(name: string): Promise<Response> { requireNonEmptyString(name, 'Module name'); return this.request.execute('GET', `/modules/${encode(name)}/syntax`); }
  call(name: string, route = '', method: HttpMethod | string = 'GET', body: RequestBody = null, params: QueryParams = {}): Promise<Response> {
    requireNonEmptyString(name, 'Module name');
    const suffix = route ? `/${route.replace(/^\/+/, '')}` : '';
    return this.request.execute(method, `/modules/${encode(name)}${suffix}`, body, params);
  }
}

export class Aliases {
  constructor(private readonly request: Request) {}
  list(): Promise<Response> { return this.request.execute('GET', '/aliases'); }
  get(name: string): Promise<Response> { Validator.validateCollectionName(name); return this.request.execute('GET', `/aliases/${encode(name)}`); }
  create(name: string, params: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(name); return this.request.execute('POST', `/aliases/${encode(name)}`, params); }
  update(name: string, params: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(name); return this.request.execute('PUT', `/aliases/${encode(name)}`, params); }
  upsert(name: string, params: Record<string, unknown>): Promise<Response> { return this.create(name, params); }
  delete(name: string): Promise<Response> { Validator.validateCollectionName(name); return this.request.execute('DELETE', `/aliases/${encode(name)}`); }
}

export class Overrides {
  constructor(private readonly request: Request) {}
  list(collectionName: string): Promise<Response> { Validator.validateCollectionName(collectionName); return this.request.execute('GET', `/collections/${encode(collectionName)}/overrides`); }
  get(collectionName: string, id: string | number): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('GET', `/collections/${encode(collectionName)}/overrides/${encode(id)}`); }
  create(collectionName: string, id: string | number, override: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('POST', `/collections/${encode(collectionName)}/overrides/${encode(id)}`, override); }
  update(collectionName: string, id: string | number, override: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('PUT', `/collections/${encode(collectionName)}/overrides/${encode(id)}`, override); }
  upsert(collectionName: string, id: string | number, override: Record<string, unknown>): Promise<Response> { return this.create(collectionName, id, override); }
  delete(collectionName: string, id: string | number): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('DELETE', `/collections/${encode(collectionName)}/overrides/${encode(id)}`); }
}

export class Synonyms {
  constructor(private readonly request: Request) {}
  list(collectionName: string): Promise<Response> { Validator.validateCollectionName(collectionName); return this.request.execute('GET', `/collections/${encode(collectionName)}/synonyms`); }
  get(collectionName: string, id: string | number): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('GET', `/collections/${encode(collectionName)}/synonyms/${encode(id)}`); }
  create(collectionName: string, id: string | number, synonym: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('POST', `/collections/${encode(collectionName)}/synonyms/${encode(id)}`, synonym); }
  update(collectionName: string, id: string | number, synonym: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('PUT', `/collections/${encode(collectionName)}/synonyms/${encode(id)}`, synonym); }
  upsert(collectionName: string, id: string | number, synonym: Record<string, unknown>): Promise<Response> { return this.create(collectionName, id, synonym); }
  delete(collectionName: string, id: string | number): Promise<Response> { Validator.validateCollectionName(collectionName); Validator.validateDocumentId(id); return this.request.execute('DELETE', `/collections/${encode(collectionName)}/synonyms/${encode(id)}`); }
  listAll(): Promise<Response> { return this.request.execute('GET', '/synonyms'); }
  listGlobal(): Promise<Response> { return this.request.execute('GET', '/synonyms/global'); }
  getGlobal(id: string | number): Promise<Response> { Validator.validateDocumentId(id); return this.request.execute('GET', `/synonyms/global/${encode(id)}`); }
  createGlobal(id: string | number, synonym: Record<string, unknown>): Promise<Response> { Validator.validateDocumentId(id); return this.request.execute('POST', `/synonyms/global/${encode(id)}`, synonym); }
  updateGlobal(id: string | number, synonym: Record<string, unknown>): Promise<Response> { Validator.validateDocumentId(id); return this.request.execute('PUT', `/synonyms/global/${encode(id)}`, synonym); }
  upsertGlobal(id: string | number, synonym: Record<string, unknown>): Promise<Response> { return this.createGlobal(id, synonym); }
  deleteGlobal(id: string | number): Promise<Response> { Validator.validateDocumentId(id); return this.request.execute('DELETE', `/synonyms/global/${encode(id)}`); }
}

function validateWord(word: string, fieldName = 'word'): void {
  if (!word || typeof word !== 'string' || word.trim() === '') {
    throw new ValidationException(`${fieldName} must be a non-empty string`);
  }
}

export class Stopwords {
  constructor(private readonly request: Request) {}
  list(collectionName: string): Promise<Response> { Validator.validateCollectionName(collectionName); return this.request.execute('GET', `/collections/${encode(collectionName)}/stopwords`); }
  create(collectionName: string, params: Record<string, unknown>): Promise<Response> { Validator.validateCollectionName(collectionName); return this.request.execute('POST', `/collections/${encode(collectionName)}/stopwords`, params); }
  delete(collectionName: string, word: string): Promise<Response> { Validator.validateCollectionName(collectionName); validateWord(word); return this.request.execute('DELETE', `/collections/${encode(collectionName)}/stopwords/${encode(word)}`); }
  listAll(): Promise<Response> { return this.request.execute('GET', '/stopwords'); }
  listGlobal(): Promise<Response> { return this.request.execute('GET', '/stopwords/global'); }
  createGlobal(params: Record<string, unknown>): Promise<Response> { return this.request.execute('POST', '/stopwords/global', params); }
  deleteGlobal(word: string): Promise<Response> { validateWord(word); return this.request.execute('DELETE', `/stopwords/global/${encode(word)}`); }
}

export class Client {
  readonly request: Request;
  private readonly _collections: Collections;
  private readonly _documents: Documents;
  private readonly _search: Search;
  private readonly _keys: Keys;
  private readonly _users: Users;
  private readonly _aliases: Aliases;
  private readonly _overrides: Overrides;
  private readonly _synonyms: Synonyms;
  private readonly _stopwords: Stopwords;
  private readonly _system: System;
  private readonly _modules: Modules;

  constructor(baseUrl: string | null = null, options: ClientOptions = {}) {
    const opts = Config.mergeDefaults(options);
    const normalizedBaseUrl = Config.normalizeUrl(baseUrl || opts.base_url);
    if (!Config.isValidUrl(normalizedBaseUrl)) {
      throw new Error(`Invalid base URL: ${normalizedBaseUrl}`);
    }
    this.request = new Request(normalizedBaseUrl, opts.timeout, opts.token, opts.auth_method);
    this._collections = new Collections(this.request);
    this._documents = new Documents(this.request);
    this._search = new Search(this.request, this._collections);
    this._keys = new Keys(this.request);
    this._users = new Users(this.request);
    this._aliases = new Aliases(this.request);
    this._overrides = new Overrides(this.request);
    this._synonyms = new Synonyms(this.request);
    this._stopwords = new Stopwords(this.request);
    this._system = new System(this.request);
    this._modules = new Modules(this.request);
  }

  setAuthToken(token: string, method: AuthMethod = 'bearer'): this { this.request.setAuthToken(token, method); return this; }
  clearAuth(): this { this.request.clearAuth(); return this; }

  health(): Promise<Response> { return this._system.health(); }
  ready(): Promise<Response> { return this._system.ready(); }
  stats(): Promise<Response> { return this._system.stats(); }
  etc(): Promise<Response> { return this._system.etc(); }
  info(): Promise<Response> { return this._system.info(); }
  status(): Promise<Response> { return this._system.status(); }
  query(): Promise<Response> { return this._system.query(); }
  startup(): Promise<Response> { return this._system.startup(); }
  bootStatus(): Promise<Response> { return this._system.bootStatus(); }
  metrics(): Promise<Response> { return this._system.metrics(); }
  metricsJson(): Promise<Response> { return this._system.metricsJson(); }
  connections(): Promise<Response> { return this._system.connections(); }
  rocksdb(): Promise<Response> { return this._system.rocksdb(); }
  rocksdbInternal(): Promise<Response> { return this._system.rocksdbInternal(); }
  docTotal(): Promise<Response> { return this._system.docTotal(); }
  ping(): Promise<Response> { return this._system.ping(); }
  integrity(): Promise<Response> { return this._system.integrity(); }
  consistency(): Promise<Response> { return this._system.consistency(); }
  selfCheck(): Promise<Response> { return this._system.selfCheck(); }
  storageStatus(): Promise<Response> { return this._system.storageStatus(); }
  searchConfig(): Promise<Response> { return this._system.searchConfig(); }
  updateCounters(params: QueryParams = {}): Promise<Response> { return this._system.updateCounters(params); }
  repair(params: QueryParams = {}): Promise<Response> { return this._system.repair(params); }
  updateCountersPost(body: Record<string, unknown> = {}): Promise<Response> { return this._system.updateCountersPost(body); }
  repairPost(body: Record<string, unknown> = {}): Promise<Response> { return this._system.repairPost(body); }
  sql(sql: string, params: QueryParams = {}): Promise<Response> { return this._system.sql(sql, params); }
  execSql(sql: string): Promise<Response> { return this._system.execSql(sql); }

  clusterHealth(): Promise<Response> { return this.request.execute('GET', '/cluster/health'); }
  clusterStats(): Promise<Response> { return this.request.execute('GET', '/cluster/stats'); }
  clusterNodes(): Promise<Response> { return this.request.execute('GET', '/cluster/nodes'); }
  links(): Promise<Response> { return this.request.execute('GET', '/links'); }
  linksPing(): Promise<Response> { return this.request.execute('GET', '/links/ping'); }
  linksConnect(endpointOrHost: string, port: number | null = null): Promise<Response> {
    return this.request.execute('POST', '/links/connect', port === null ? { endpoint: endpointOrHost } : { host: endpointOrHost, port });
  }
  linksDisconnect(endpointOrHost: string, port: number | null = null): Promise<Response> {
    return this.request.execute('POST', '/links/disconnect', port === null ? { endpoint: endpointOrHost } : { host: endpointOrHost, port });
  }
  flush(): Promise<Response> { return this.request.execute('POST', '/flush'); }

  collections(): Collections { return this._collections; }
  documents(): Documents { return this._documents; }
  searchApi(): Search { return this._search; }
  aliases(): Aliases { return this._aliases; }
  overrides(): Overrides { return this._overrides; }
  synonyms(): Synonyms { return this._synonyms; }
  stopwords(): Stopwords { return this._stopwords; }
  system(): System { return this._system; }
  keys(): Keys { return this._keys; }
  users(): Users { return this._users; }
  modules(): Modules { return this._modules; }

  listCollections(offset = 0, limit = 10): Promise<Response> { return this._collections.list(offset, limit); }
  listCollectionsDistributed(): Promise<Response> { return this.request.execute('GET', '/collections/distributed'); }
  getCollection(name: string): Promise<Response> { return this._collections.get(name); }
  getCollectionFields(name: string): Promise<Response> { return this._collections.getFields(name); }
  getCollectionLanguage(name: string): Promise<Response> { return this._collections.getLanguage(name); }
  listDocuments(collectionName: string, params: SearchParams = {}): Promise<Response> { return this._documents.list(collectionName, params); }
  getDocument(collectionName: string, documentId: string | number): Promise<Response> { return this._documents.get(collectionName, documentId); }
  exportDocuments(collectionName: string, params: SearchParams = {}): Promise<Response> { return this._documents.export(collectionName, params); }
  facetCounts(collectionName: string, params: SearchParams = {}): Promise<Response> { return this._documents.facetCounts(collectionName, params); }
  maybe(collectionName: string, params: SearchParams = {}): Promise<Response> { return this._documents.maybe(collectionName, params); }
  documentContext(collectionName: string, documentId: string | number, params: QueryParams = {}): Promise<Response> {
    return this._documents.context(collectionName, documentId, params);
  }
  search(collectionName: string, params: SearchParams = {}): Promise<Response> { return this._search.search(collectionName, params); }
  sqlSearch(collectionName: string, sql: string, params: QueryParams = {}): Promise<Response> { return this._search.sql(collectionName, sql, params); }
  vectorSearch(collectionName: string, params: VectorSearchParams = {}): Promise<Response> { return this._search.vectorSearch(collectionName, params); }
  globalSearch(params: SearchParams = {}): Promise<Response> { return this._search.globalSearch(params); }
  executeRequest(method: HttpMethod | string, requestPath: string, body: RequestBody = null, queryParams: QueryParams = {}): Promise<Response> {
    return this.request.execute(method, requestPath, body, queryParams);
  }

  indices(params: { offset?: number; limit?: number } = {}): Promise<Response> {
    return this.listCollections(params.offset || 0, params.limit || 10);
  }

  get(params: { index?: string; id?: string | number }): Promise<Response> {
    if (params.index && params.id !== undefined) return this.getDocument(params.index, params.id);
    if (params.index) return this.getCollection(params.index);
    throw new Error('Invalid parameters for get()');
  }

  cat(type = 'indices', params: { offset?: number; limit?: number } = {}): Promise<Response> {
    if (type === 'indices') return this.indices(params);
    throw new Error(`Unsupported cat type: ${type}`);
  }
}

export const NODE_CLIENT_ROUTE_COVERAGE = [
  { path: '/', methods: ['GET'], status: 'supported', client: 'system.info' },
  { path: '/health', methods: ['GET'], status: 'supported', client: 'system.health' },
  { path: '/ready', methods: ['GET'], status: 'supported', client: 'system.ready' },
  { path: '/status', methods: ['GET'], status: 'supported', client: 'system.status' },
  { path: '/query', methods: ['GET'], status: 'supported', client: 'system.query' },
  { path: '/startup', methods: ['GET'], status: 'supported', client: 'system.startup' },
  { path: '/boot-status', methods: ['GET'], status: 'supported', client: 'system.bootStatus' },
  { path: '/stats', methods: ['GET'], status: 'supported', client: 'system.stats' },
  { path: '/metrics', methods: ['GET'], status: 'supported', client: 'system.metrics' },
  { path: '/metrics.json', methods: ['GET'], status: 'supported', client: 'system.metricsJson' },
  { path: '/search-config', methods: ['GET'], status: 'supported', client: 'system.searchConfig' },
  { path: '/update-counters', methods: ['GET', 'POST'], status: 'supported', client: 'system.updateCounters/updateCountersPost' },
  { path: '/repair', methods: ['GET', 'POST'], status: 'supported', client: 'system.repair/repairPost' },
  { path: '/users', methods: ['GET', 'POST'], status: 'supported', client: 'users.list/create' },
  { path: '/users/{id}', methods: ['GET', 'PUT', 'DELETE'], status: 'supported', client: 'users.get/update/delete' },
  { path: '/keys', methods: ['GET', 'POST'], status: 'supported', client: 'keys.list/create' },
  { path: '/keys/{id}', methods: ['GET', 'PUT', 'DELETE'], status: 'supported', client: 'keys.get/update/delete' },
  { path: '/collections', methods: ['GET', 'POST'], status: 'supported', client: 'collections.list/create' },
  { path: '/collections/distributed', methods: ['GET'], status: 'supported', client: 'listCollectionsDistributed' },
  { path: '/collections/{name}/lang', methods: ['GET'], status: 'supported', client: 'collections.getLanguage' },
  { path: '/collections/{name}/search', methods: ['GET', 'POST'], status: 'supported', client: 'search.search' },
  { path: '/collections/{name}/documents/maybe', methods: ['GET', 'POST'], status: 'supported', client: 'documents.maybe' },
  { path: '/collections/{name}/documents/{id}/context', methods: ['GET'], status: 'supported', client: 'documents.context' },
  { path: '/collections/{name}/vector_search', methods: ['GET', 'POST'], status: 'supported', client: 'search.vectorSearch' },
  { path: '/multi_search', methods: ['POST'], status: 'supported', client: 'search.multiSearch' },
  { path: '/sql', methods: ['GET', 'POST'], status: 'supported', client: 'system.sql/execSql' },
  { path: '/modules', methods: ['GET'], status: 'supported', client: 'modules.list' },
  { path: '/modules/{name}/syntax', methods: ['GET'], status: 'supported', client: 'modules.syntax' },
  { path: '/modules/{name}/{route}', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], status: 'supported', client: 'modules.call' },
] as const;

export const Exceptions = {
  HlqueryException,
  AuthenticationException,
  RequestException,
  ValidationException,
  CollectionException,
  DocumentException,
  SearchException,
  DemoModeException,
};

export const Utils = {
  Config,
  Validator,
};

export default Client;

const commonJsExport = Client as typeof Client & Record<string, unknown>;
Object.assign(commonJsExport, {
  Client,
  Request,
  Response,
  Collections,
  Documents,
  Search,
  Keys,
  Users,
  Aliases,
  Overrides,
  Synonyms,
  Stopwords,
  System,
  Modules,
  Exceptions,
  Utils,
  Config,
  Validator,
  NODE_CLIENT_ROUTE_COVERAGE,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonJsExport;
}
