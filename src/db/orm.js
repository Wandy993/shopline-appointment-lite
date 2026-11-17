import { AsyncLocalStorage } from 'node:async_hooks';

import { randomBytes } from 'node:crypto';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const ARRAY_PATHS = new Set([
  'scopes', 'staffIds', 'bucketKeys', 'bookingIds', 'occurrences', 'answers', 'events',
  'calendarEvents', 'weeklyAvailability', 'availabilityExceptions', 'customQuestions',
  'products', 'productIds', 'additionalMerchantNotificationEmails', 'supportedServices',
  'windows', 'templates'
]);

export class ObjectId {
  constructor(value) {
    const normalized = value == null ? randomBytes(12).toString('hex') : String(value);
    if (!OBJECT_ID_RE.test(normalized)) throw new TypeError('Invalid ObjectId');
    this.value = normalized.toLowerCase();
  }
  toString() { return this.value; }
  valueOf() { return this.value; }
  toJSON() { return this.value; }
  [Symbol.toPrimitive]() { return this.value; }
  static isValid(value) {
    try { return OBJECT_ID_RE.test(String(value)); } catch { return false; }
  }
}

const ObjectIdType = Symbol('ObjectId');
const MixedType = Symbol('Mixed');
const MapType = Symbol('Map');

export class Schema {
  constructor(definition = {}, options = {}) {
    this.obj = definition || {};
    this.options = options || {};
    this._indexes = [];
  }
  index(fields, options = {}) {
    this._indexes.push({ fields, options });
    return this;
  }
  indexes() {
    return this._indexes.map(item => [cloneValue(item.fields), cloneValue(item.options)]);
  }
  path(path) {
    const parts = String(path || '').split('.');
    let definition = this.obj;
    let info;
    for (let index = 0; index < parts.length; index += 1) {
      if (!definition || typeof definition !== 'object' || !Object.prototype.hasOwnProperty.call(definition, parts[index])) return undefined;
      info = fieldInfo(definition[parts[index]]);
      if (index < parts.length - 1) definition = info.schema ? info.schema.obj : info.nested;
    }
    return info;
  }
  set() { return this; }
  pre() { return this; }
  post() { return this; }
}
Schema.Types = {
  ObjectId: ObjectIdType,
  Mixed: MixedType,
  Map: MapType,
  Decimal128: Symbol('Decimal128'),
  Buffer: Symbol('Buffer')
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    !(value instanceof Date) && !(value instanceof ObjectId) && !(value instanceof Map);
}

function cloneValue(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof ObjectId) return new ObjectId(value.toString());
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, item]) => [key, cloneValue(item)]));
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  return value;
}

function serializable(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, item]) => [key, serializable(item)]));
  if (Array.isArray(value)) return value.map(serializable);
  if (isPlainObject(value)) {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined && typeof item !== 'function') result[key] = serializable(item);
    }
    return result;
  }
  return value;
}

function serializeDocument(document) {
  return JSON.stringify(serializable(document));
}

function reviveDates(value) {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (!isPlainObject(value)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return date;
    }
    return value;
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key] = reviveDates(item);
  return result;
}

function parseDocument(raw) {
  return reviveDates(JSON.parse(raw));
}

function fieldInfo(definition) {
  if (definition instanceof Schema) return { schema: definition, options: {} };
  if (Array.isArray(definition)) return { array: true, item: definition[0], options: {} };
  if (definition && typeof definition === 'object' && Object.prototype.hasOwnProperty.call(definition, 'type')) {
    const type = definition.type;
    if (type instanceof Schema) return { schema: type, options: definition };
    if (Array.isArray(type)) return { array: true, item: type[0], options: definition };
    return { type, options: definition };
  }
  if (isPlainObject(definition)) return { nested: definition, options: {} };
  return { type: definition, options: {} };
}

function defaultValue(options) {
  if (!options || !Object.prototype.hasOwnProperty.call(options, 'default') || options.default === undefined) return undefined;
  const value = options.default;
  return cloneValue(typeof value === 'function' ? value() : value);
}

function normalizeScalar(value, info) {
  if (value == null) return value;
  const type = info.type;
  let result = value;
  if (type === String) result = String(value);
  else if (type === Number) {
    const number = Number(value);
    result = Number.isFinite(number) ? number : value;
  } else if (type === Boolean) {
    if (value === 'false' || value === 0 || value === '0') result = false;
    else if (value === 'true' || value === 1 || value === '1') result = true;
    else result = Boolean(value);
  } else if (type === Date) {
    result = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(result.getTime())) result = value;
  } else if (type === ObjectIdType) {
    result = value instanceof ObjectId ? value.toString() : String(value);
  } else if (type === MapType && value instanceof Map) {
    result = Object.fromEntries(value.entries());
  }
  if (typeof result === 'string' && info.options?.trim) result = result.trim();
  if (typeof result === 'string' && info.options?.lowercase) result = result.toLowerCase();
  return result;
}

function normalizeField(value, info) {
  if (value === undefined) return undefined;
  if (info.schema) return applySchemaDefaults(info.schema, value);
  if (info.array) {
    const values = Array.isArray(value) ? value : [value];
    const itemInfo = fieldInfo(info.item);
    return values.map(item => {
      if (itemInfo.schema) return applySchemaDefaults(itemInfo.schema, item);
      if (itemInfo.nested) return applyNestedDefaults(itemInfo.nested, item);
      if (itemInfo.array) return normalizeField(item, itemInfo);
      return normalizeScalar(item, itemInfo);
    });
  }
  if (info.nested) return applyNestedDefaults(info.nested, value);
  return normalizeScalar(value, info);
}

function applyNestedDefaults(definition, input) {
  const result = isPlainObject(input) ? cloneValue(input) : {};
  for (const [key, field] of Object.entries(definition || {})) {
    const info = fieldInfo(field);
    if (result[key] === undefined) {
      const fallback = defaultValue(info.options);
      if (fallback !== undefined) result[key] = fallback;
      else if (info.array) result[key] = [];
      else if (info.nested) result[key] = {};
    }
    if (result[key] !== undefined) result[key] = normalizeField(result[key], info);
  }
  return result;
}

function applySchemaDefaults(schema, input) {
  const result = isPlainObject(input) ? cloneValue(input) : {};
  if (schema.options?._id !== false && result._id == null) result._id = new ObjectId();
  for (const [key, field] of Object.entries(schema.obj || {})) {
    const info = fieldInfo(field);
    if (result[key] === undefined) {
      const fallback = defaultValue(info.options);
      if (fallback !== undefined) result[key] = fallback;
      else if (info.array) result[key] = [];
      else if (info.nested) result[key] = {};
    }
    if (result[key] !== undefined) result[key] = normalizeField(result[key], info);
  }
  return result;
}

function validationError(path, message, value) {
  const error = new Error('Validation failed: ' + path + ': ' + message);
  error.name = 'ValidationError';
  error.errors = { [path]: { path, message, value } };
  return error;
}

function validateDefinition(definition, value, path) {
  const info = fieldInfo(definition);
  const options = info.options || {};
  if (options.required && (value === undefined || value === null || value === '')) {
    throw validationError(path, 'Path is required.', value);
  }
  if (value == null) return;
  if (options.enum && !options.enum.includes(value)) throw validationError(path, 'Value is not in the allowed list.', value);
  if (typeof value === 'string') {
    if (Number.isFinite(options.maxlength) && value.length > options.maxlength) throw validationError(path, 'Value is too long.', value);
    if (Number.isFinite(options.minlength) && value.length < options.minlength) throw validationError(path, 'Value is too short.', value);
    if (options.match instanceof RegExp && !options.match.test(value)) throw validationError(path, 'Value has an invalid format.', value);
  }
  if (typeof value === 'number') {
    if (Number.isFinite(options.min) && value < options.min) throw validationError(path, 'Value is below the minimum.', value);
    if (Number.isFinite(options.max) && value > options.max) throw validationError(path, 'Value exceeds the maximum.', value);
  }
  if (info.schema && isPlainObject(value)) validateSchema(info.schema, value, path);
  else if (info.nested && isPlainObject(value)) validateNested(info.nested, value, path);
  else if (info.array && Array.isArray(value)) {
    const itemInfo = fieldInfo(info.item);
    if (itemInfo.schema) value.forEach((item, index) => validateSchema(itemInfo.schema, item, path + '.' + index));
    else if (itemInfo.nested) value.forEach((item, index) => validateNested(itemInfo.nested, item, path + '.' + index));
  }
}

function validateNested(definition, document, prefix) {
  for (const [key, field] of Object.entries(definition || {})) {
    validateDefinition(field, document?.[key], prefix ? prefix + '.' + key : key);
  }
}

function validateSchema(schema, document, prefix = '') {
  for (const [key, field] of Object.entries(schema.obj || {})) {
    validateDefinition(field, document?.[key], prefix ? prefix + '.' + key : key);
  }
}

function getPathValues(value, pathParts) {
  if (!pathParts.length) return [value];
  if (Array.isArray(value)) return value.flatMap(item => getPathValues(item, pathParts));
  if (value == null || typeof value !== 'object') return [];
  const [head, ...tail] = pathParts;
  if (!Object.prototype.hasOwnProperty.call(value, head)) return [];
  return getPathValues(value[head], tail);
}

function getPath(value, path) {
  const values = getPathValues(value, String(path).split('.'));
  return values.length ? values[0] : undefined;
}

function setPath(target, path, value) {
  const parts = String(path).split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = cloneValue(value);
}

function unsetPath(target, path) {
  const parts = String(path).split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object') return;
    cursor = cursor[part];
  }
  if (cursor && typeof cursor === 'object') delete cursor[parts[parts.length - 1]];
}

function flattenValues(values) {
  return values.flatMap(value => Array.isArray(value) ? flattenValues(value) : [value]);
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (value instanceof ObjectId) return value.toString();
  return value;
}

function equalValues(left, right) {
  const a = comparable(left);
  const b = comparable(right);
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() === new Date(b).getTime();
  if (isPlainObject(a) || Array.isArray(a) || isPlainObject(b) || Array.isArray(b)) return serializeDocument(a) === serializeDocument(b);
  return a === b || (a != null && b != null && String(a) === String(b));
}

function compareValues(left, right) {
  const a = comparable(left);
  const b = comparable(right);
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() - new Date(b).getTime();
  return String(a).localeCompare(String(b));
}

function matchesCondition(values, expected) {
  const flat = flattenValues(values);
  const operators = isPlainObject(expected) ? Object.keys(expected).filter(key => key.startsWith('$')) : [];
  if (!operators.length) {
    if (expected === null) return values.length === 0 || flat.some(value => value === null);
    return flat.some(value => equalValues(value, expected));
  }
  for (const operator of operators) {
    const operand = expected[operator];
    if (operator === '$options') continue;
    if (operator === '$exists') {
      if (Boolean(values.length) !== Boolean(operand)) return false;
    } else if (operator === '$eq') {
      if (!flat.some(value => equalValues(value, operand))) return false;
    } else if (operator === '$ne') {
      if (operand === null && values.length === 0) return false;
      if (flat.some(value => equalValues(value, operand))) return false;
    } else if (operator === '$in') {
      const candidates = Array.isArray(operand) ? operand : [];
      if (!flat.some(value => candidates.some(candidate => equalValues(value, candidate)))) return false;
    } else if (operator === '$nin') {
      const candidates = Array.isArray(operand) ? operand : [];
      if (flat.some(value => candidates.some(candidate => equalValues(value, candidate)))) return false;
    } else if (operator === '$gt' || operator === '$gte' || operator === '$lt' || operator === '$lte') {
      const ok = flat.some(value => {
        const comparison = compareValues(value, operand);
        if (operator === '$gt') return comparison > 0;
        if (operator === '$gte') return comparison >= 0;
        if (operator === '$lt') return comparison < 0;
        return comparison <= 0;
      });
      if (!ok) return false;
    } else if (operator === '$size') {
      if (!flat.some(value => Array.isArray(value) && value.length === Number(operand))) return false;
    } else if (operator === '$all') {
      const required = Array.isArray(operand) ? operand : [];
      if (!flat.some(value => Array.isArray(value) && required.every(item => value.some(entry => equalValues(entry, item))))) return false;
    } else if (operator === '$elemMatch') {
      if (!flat.some(value => Array.isArray(value) && value.some(item => matchesFilter(item, operand)))) return false;
    } else if (operator === '$regex') {
      const regex = operand instanceof RegExp ? operand : new RegExp(String(operand), String(expected.$options || ''));
      if (!flat.some(value => typeof value === 'string' && regex.test(value))) return false;
    } else if (operator === '$not') {
      if (matchesCondition(values, operand)) return false;
    } else {
      return false;
    }
  }
  return true;
}

function evaluateExpression(expression, document) {
  if (Array.isArray(expression)) return expression.map(item => evaluateExpression(item, document));
  if (typeof expression === 'string' && expression.startsWith('$')) return getPath(document, expression.slice(1));
  if (!isPlainObject(expression)) return expression;
  const [operator, operand] = Object.entries(expression)[0] || [];
  const args = Array.isArray(operand) ? operand.map(item => evaluateExpression(item, document)) : [evaluateExpression(operand, document)];
  if (operator === '$lt') return compareValues(args[0], args[1]) < 0;
  if (operator === '$lte') return compareValues(args[0], args[1]) <= 0;
  if (operator === '$gt') return compareValues(args[0], args[1]) > 0;
  if (operator === '$gte') return compareValues(args[0], args[1]) >= 0;
  if (operator === '$eq') return equalValues(args[0], args[1]);
  if (operator === '$ne') return !equalValues(args[0], args[1]);
  if (operator === '$and') return args.every(Boolean);
  if (operator === '$or') return args.some(Boolean);
  return undefined;
}

function matchesFilter(document, filter = {}) {
  if (!filter || !Object.keys(filter).length) return true;
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(expected) || !expected.some(item => matchesFilter(document, item))) return false;
    } else if (key === '$and') {
      if (!Array.isArray(expected) || !expected.every(item => matchesFilter(document, item))) return false;
    } else if (key === '$nor') {
      if (Array.isArray(expected) && expected.some(item => matchesFilter(document, item))) return false;
    } else if (key === '$expr') {
      if (!evaluateExpression(expected, document)) return false;
    } else if (key.startsWith('$')) {
      return false;
    } else if (!matchesCondition(getPathValues(document, key.split('.')), expected)) {
      return false;
    }
  }
  return true;
}

function applyPatch(target, patch) {
  const result = cloneValue(target || {});
  for (const [key, change] of Object.entries(patch || {})) {
    if (change && change.__delete === true) {
      delete result[key];
    } else if (change && change.__patch) {
      result[key] = applyPatch(result[key] || {}, change.__patch);
    } else if (change && Object.prototype.hasOwnProperty.call(change, '__set')) {
      result[key] = cloneValue(change.__set);
    }
  }
  return result;
}

function diffPatch(original, current) {
  const patch = {};
  const keys = new Set([...Object.keys(original || {}), ...Object.keys(current || {})]);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(current || {}, key)) {
      patch[key] = { __delete: true };
    } else if (isPlainObject(original?.[key]) && isPlainObject(current?.[key])) {
      const nested = diffPatch(original[key], current[key]);
      if (Object.keys(nested).length) patch[key] = { __patch: nested };
    } else if (!equalValues(original?.[key], current[key]) || !Object.prototype.hasOwnProperty.call(original || {}, key)) {
      patch[key] = { __set: cloneValue(current[key]) };
    }
  }
  return patch;
}

function mergeDeep(target, source) {
  const result = cloneValue(target || {});
  for (const [key, value] of Object.entries(source || {})) {
    if (isPlainObject(value) && isPlainObject(result[key])) result[key] = mergeDeep(result[key], value);
    else result[key] = cloneValue(value);
  }
  return result;
}

function applyUpdate(document, update = {}, isInsert = false) {
  const next = cloneValue(document || {});
  const entries = Object.entries(update || {});
  const operatorMode = entries.some(([key]) => key.startsWith('$'));
  if (!operatorMode) return mergeDeep(next, update);
  for (const [operator, values] of entries) {
    if (!isPlainObject(values)) continue;
    if (operator === '$set' || (operator === '$setOnInsert' && isInsert)) {
      for (const [path, value] of Object.entries(values)) setPath(next, path, value);
    } else if (operator === '$unset') {
      for (const path of Object.keys(values)) unsetPath(next, path);
    } else if (operator === '$inc') {
      for (const [path, amount] of Object.entries(values)) setPath(next, path, Number(getPath(next, path) || 0) + Number(amount || 0));
    } else if (operator === '$addToSet' || operator === '$push') {
      for (const [path, rawValue] of Object.entries(values)) {
        const current = Array.isArray(getPath(next, path)) ? [...getPath(next, path)] : [];
        const each = isPlainObject(rawValue) && Array.isArray(rawValue.$each) ? rawValue.$each : [rawValue];
        if (operator === '$addToSet') {
          for (const item of each) if (!current.some(existing => equalValues(existing, item))) current.push(cloneValue(item));
        } else {
          const position = isPlainObject(rawValue) && Number.isInteger(rawValue.$position) ? rawValue.$position : current.length;
          current.splice(position, 0, ...each.map(cloneValue));
          if (isPlainObject(rawValue) && Number.isInteger(rawValue.$slice)) {
            if (rawValue.$slice >= 0) current.splice(rawValue.$slice);
            else current.splice(0, Math.max(0, current.length + rawValue.$slice));
          }
        }
        setPath(next, path, current);
      }
    } else if (operator === '$pull' || operator === '$pullAll') {
      for (const [path, condition] of Object.entries(values)) {
        const current = Array.isArray(getPath(next, path)) ? getPath(next, path) : [];
        const remove = operator === '$pullAll' && Array.isArray(condition) ? condition : [condition];
        setPath(next, path, current.filter(item => !remove.some(candidate => {
          if (isPlainObject(candidate) && Object.keys(candidate).some(key => key.startsWith('$'))) return matchesCondition([item], candidate);
          if (isPlainObject(candidate)) return matchesFilter(item, candidate);
          return equalValues(item, candidate);
        })));
      }
    } else if (operator === '$currentDate') {
      for (const [path, enabled] of Object.entries(values)) if (enabled) setPath(next, path, new Date());
    } else if (operator === '$min' || operator === '$max') {
      for (const [path, value] of Object.entries(values)) {
        const current = getPath(next, path);
        if (current === undefined || (operator === '$min' ? compareValues(value, current) < 0 : compareValues(value, current) > 0)) setPath(next, path, value);
      }
    } else if (operator === '$rename') {
      for (const [path, destination] of Object.entries(values)) {
        const current = getPath(next, path);
        if (current !== undefined) {
          setPath(next, destination, current);
          unsetPath(next, path);
        }
      }
    }
  }
  return next;
}

function projectionSpec(specification) {
  const result = { include: [], exclude: [], forceInclude: [] };
  if (!specification) return result;
  if (typeof specification === 'string') {
    for (const token of specification.split(/\s+/).filter(Boolean)) {
      if (token.startsWith('+')) result.forceInclude.push(token.slice(1));
      else if (token.startsWith('-')) result.exclude.push(token.slice(1));
      else result.include.push(token);
    }
  } else if (isPlainObject(specification)) {
    for (const [key, value] of Object.entries(specification)) {
      if (Number(value) === 1) result.include.push(key);
      else if (Number(value) === 0) result.exclude.push(key);
    }
  }
  return result;
}

function copyPath(source, target, path) {
  const value = getPath(source, path);
  if (value !== undefined) setPath(target, path, value);
}

function projectDocument(document, specification, hiddenFields = []) {
  const projection = projectionSpec(specification);
  const includeOnly = projection.include.length > 0;
  let result;
  if (includeOnly) {
    result = {};
    if (!projection.exclude.includes('_id') && document._id !== undefined) result._id = cloneValue(document._id);
    for (const path of projection.include) copyPath(document, result, path);
  } else {
    result = cloneValue(document);
  }
  for (const path of [...hiddenFields, ...projection.exclude]) {
    const explicitlyIncluded = projection.forceInclude.includes(path) || projection.include.includes(path);
    if (!explicitlyIncluded) unsetPath(result, path);
  }
  for (const path of projection.forceInclude) copyPath(document, result, path);
  return result;
}

function sortSpec(specification) {
  if (!specification) return [];
  if (typeof specification === 'string') {
    return specification.split(/\s+/).filter(Boolean).map(token => [token.replace(/^-/, ''), token.startsWith('-') ? -1 : 1]);
  }
  if (Array.isArray(specification)) return specification;
  return Object.entries(specification);
}

function compareDocuments(left, right, specification) {
  for (const [path, direction] of sortSpec(specification)) {
    const comparison = compareValues(getPath(left, path), getPath(right, path));
    if (comparison) return comparison * (Number(direction) < 0 ? -1 : 1);
  }
  return 0;
}

function sqlValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function sqlPrefilter(filter = {}) {
  const clauses = [];
  const values = [];
  for (const [key, expected] of Object.entries(filter || {})) {
    if (key.startsWith('$') || key.split('.').some(part => ARRAY_PATHS.has(part))) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) continue;
    const path = '$.' + key.split('.').join('.');
    const expression = "json_extract(payload, '" + path + "')";
    if (expected === null) {
      clauses.push(expression + ' IS NULL');
      continue;
    }
    if (expected instanceof Date || expected instanceof ObjectId || ['string', 'number', 'boolean'].includes(typeof expected)) {
      clauses.push(expression + ' = ?');
      values.push(sqlValue(expected));
      continue;
    }
    if (isPlainObject(expected)) {
      const operators = Object.keys(expected);
      if (operators.length && operators.every(operator => ['$gt', '$gte', '$lt', '$lte', '$in'].includes(operator))) {
        let supported = true;
        for (const operator of operators) {
          const operand = expected[operator];
          if (operator === '$in' && Array.isArray(operand) && operand.length && operand.every(item => item !== null && ['string', 'number', 'boolean'].includes(typeof item))) {
            clauses.push(expression + ' IN (' + operand.map(() => '?').join(',') + ')');
            values.push(...operand.map(sqlValue));
          } else if (['$gt', '$gte', '$lt', '$lte'].includes(operator) && (operand instanceof Date || ['string', 'number'].includes(typeof operand))) {
            const symbol = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[operator];
            clauses.push(expression + ' ' + symbol + ' ?');
            values.push(sqlValue(operand));
          } else {
            supported = false;
            break;
          }
        }
        if (!supported) {
          clauses.splice(clauses.length - operators.length);
          values.splice(values.length - operators.length);
        }
      }
    }
  }
  return { clauses, values };
}

async function loadRows(collection, filter = {}) {
  const database = getDatabase();
  if (database) {
    const prefilter = sqlPrefilter(filter);
    const where = prefilter.clauses.length ? ' AND ' + prefilter.clauses.join(' AND ') : '';
    const result = await database.prepare('SELECT id, payload FROM app_documents WHERE collection = ?' + where)
      .bind(collection, ...prefilter.values).all();
    return (result.results || []).map(row => ({ id: String(row.id), raw: row.payload, document: parseDocument(row.payload) }));
  }
  const store = memoryStore(collection);
  return [...store.entries()].map(([id, raw]) => ({ id, raw, document: parseDocument(raw) }));
}

const memory = new Map();

function memoryStore(collection) {
  if (!memory.has(collection)) memory.set(collection, new Map());
  return memory.get(collection);
}

function duplicateError(message) {
  const error = new Error(message || 'Duplicate key');
  error.code = 11000;
  error.name = 'MongoServerError';
  return error;
}

function uniqueKeys(collection, document) {
  const key = (kind, ...parts) => collection + ':' + kind + ':' + JSON.stringify(parts.map(value => value == null ? null : String(value)));
  const result = [];
  const add = (kind, ...parts) => result.push(key(kind, ...parts));

  if (collection === 'Shop') {
    add('handle', document.handle);
    if (document.shoplineStoreId) add('store', document.shoplineStoreId);
  } else if (collection === 'BookingReservation') {
    add('capacity', document.shopId, document.ruleId, document.slotKey, document.slotPosition);
  } else if (collection === 'Booking' && document.status === 'confirmed') {
    add('capacity', document.shopId, document.ruleId, document.slotKey, document.slotPosition);
  } else if (collection === 'StaffReservation') {
    add('occurrence', document.shopId, document.staffId, document.ruleId, document.slotKey);
    for (const bucket of document.bucketKeys || []) add('bucket', document.shopId, document.staffId, bucket);
  } else if (collection === 'CalendarConnection') {
    add('staff-calendar', document.shopId, document.staffId, document.provider);
    if (document.connectionType === 'business') add('business-calendar', document.shopId, document.provider);
  } else if (collection === 'EmailReminderDelivery') {
    add('reminder', document.bookingId, document.occurrenceKey, document.audience);
  } else if (collection === 'OpsUsageDaily') {
    add('usage', document.date, document.shopId);
  } else if (collection === 'PostPurchaseEntitlement') {
    add('entitlement', document.shopId, document.ruleId, document.orderId);
  } else if (collection === 'SubscriptionCheckout') {
    add('checkout', document.outTradeNo);
  } else if (collection === 'WebhookReceipt') {
    add('webhook', document.webhookId);
  }

  return [...new Set(result)];
}

function assertMemoryUnique(collection, document, excludeId = '') {
  const keys = new Set(uniqueKeys(collection, document));
  if (!keys.size) return;
  for (const [id, raw] of memoryStore(collection)) {
    if (id === String(excludeId)) continue;
    const existing = parseDocument(raw);
    if (uniqueKeys(collection, existing).some(key => keys.has(key))) throw duplicateError('Duplicate key for ' + collection);
  }
}

function normalizeDatabaseError(error) {
  const message = String(error?.message || error || '');
  if (error?.code === 11000) return error;
  if (/unique constraint|constraint failed|already exists/i.test(message)) return duplicateError(message);
  return error;
}

async function insertRow(Model, document) {
  const collection = Model.modelName;
  const id = String(document._id || new ObjectId());
  document._id = id;
  const raw = serializeDocument(document);
  const database = getDatabase();
  try {
    if (database) {
      const now = new Date().toISOString();
      const statements = [
        database.prepare('INSERT INTO app_documents (collection, id, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(collection, id, raw, document.createdAt instanceof Date ? document.createdAt.toISOString() : now, document.updatedAt instanceof Date ? document.updatedAt.toISOString() : now)
      ];
      for (const uniqueKey of uniqueKeys(collection, document)) {
        statements.push(database.prepare('INSERT INTO app_unique_keys (unique_key, collection, document_id) VALUES (?, ?, ?)')
          .bind(uniqueKey, collection, id));
      }
      await database.batch(statements);
    } else {
      assertMemoryUnique(collection, document);
      memoryStore(collection).set(id, raw);
    }
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
  return { id, raw };
}

async function compareAndSwap(Model, row, document) {
  const collection = Model.modelName;
  const raw = serializeDocument(document);
  const database = getDatabase();
  try {
    if (database) {
      const now = document.updatedAt instanceof Date ? document.updatedAt.toISOString() : new Date().toISOString();
      const guarded = 'EXISTS (SELECT 1 FROM app_documents WHERE collection = ? AND id = ? AND payload = ?)';
      const statements = [
        database.prepare('UPDATE app_documents SET payload = ?, updated_at = ? WHERE collection = ? AND id = ? AND payload = ?')
          .bind(raw, now, collection, row.id, row.raw),
        database.prepare('DELETE FROM app_unique_keys WHERE collection = ? AND document_id = ? AND ' + guarded)
          .bind(collection, row.id, collection, row.id, raw)
      ];
      for (const uniqueKey of uniqueKeys(collection, document)) {
        statements.push(database.prepare('INSERT INTO app_unique_keys (unique_key, collection, document_id) SELECT ?, ?, ? WHERE ' + guarded)
          .bind(uniqueKey, collection, row.id, collection, row.id, raw));
      }
      const results = await database.batch(statements);
      return Number(results[0]?.meta?.changes || 0) > 0;
    }
    const store = memoryStore(collection);
    if (store.get(row.id) !== row.raw) return false;
    assertMemoryUnique(collection, document, row.id);
    store.set(row.id, raw);
    return true;
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

async function deleteRows(Model, rows) {
  if (!rows.length) return 0;
  const collection = Model.modelName;
  const database = getDatabase();
  if (!database) {
    const store = memoryStore(collection);
    for (const row of rows) store.delete(row.id);
    return rows.length;
  }
  let deleted = 0;
  for (let offset = 0; offset < rows.length; offset += 400) {
    const chunk = rows.slice(offset, offset + 400);
    const ids = chunk.map(row => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const results = await database.batch([
      database.prepare('DELETE FROM app_unique_keys WHERE collection = ? AND document_id IN (' + placeholders + ')').bind(collection, ...ids),
      database.prepare('DELETE FROM app_documents WHERE collection = ? AND id IN (' + placeholders + ')').bind(collection, ...ids)
    ]);
    deleted += Number(results[1]?.meta?.changes || 0);
  }
  return deleted;
}

function addTimestamps(Model, document, isNew = false) {
  const result = document;
  if (Model.schema.options?.timestamps) {
    const now = new Date();
    if (isNew && !result.createdAt) result.createdAt = now;
    result.updatedAt = now;
  }
  return result;
}

function seedFromFilter(filter = {}) {
  const seed = {};
  for (const [key, value] of Object.entries(filter || {})) {
    if (key.startsWith('$')) continue;
    if (isPlainObject(value) && Object.keys(value).some(item => item.startsWith('$'))) continue;
    setPath(seed, key, value);
  }
  return seed;
}

function makeDocument(Model, fullDocument, queryOptions = {}) {
  const hidden = Model.hiddenFields || [];
  const projected = projectDocument(fullDocument, queryOptions.projection, hidden);
  if (queryOptions.lean) return projected;
  const original = cloneValue(fullDocument);
  Object.defineProperty(projected, '__original', { value: original, writable: true, enumerable: false });
  Object.defineProperty(projected, '__model', { value: Model, enumerable: false });
  Object.defineProperty(projected, 'id', { get() { return this._id == null ? undefined : String(this._id); }, enumerable: false });
  Object.defineProperty(projected, 'save', {
    enumerable: false,
    value: async function save() {
      await persistDocument(Model, this, this.__original);
      return this;
    }
  });
  Object.defineProperty(projected, 'toObject', { enumerable: false, value: function toObject() { return cloneValue(this); } });
  Object.defineProperty(projected, 'toJSON', { enumerable: false, value: function toJSON() { return serializable(this); } });
  Object.defineProperty(projected, 'get', { enumerable: false, value: function get(path) { return getPath(this, path); } });
  Object.defineProperty(projected, 'set', {
    enumerable: false,
    value: function set(path, value) {
      if (isPlainObject(path)) Object.assign(this, cloneValue(path));
      else setPath(this, path, value);
      return this;
    }
  });
  Object.defineProperty(projected, 'markModified', { enumerable: false, value: function markModified() {} });
  Object.defineProperty(projected, 'isModified', { enumerable: false, value: function isModified() { return true; } });
  return projected;
}

async function persistDocument(Model, document, original) {
  const id = String(document._id || new ObjectId());
  document._id = id;
  if (!original) {
    const next = applySchemaDefaults(Model.schema, document);
    addTimestamps(Model, next, true);
    validateSchema(Model.schema, next);
    await insertRow(Model, next);
    document.__original = cloneValue(next);
    return document;
  }
  const patch = diffPatch(original, mergeDeep(original, document));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const rows = await loadRows(Model.modelName, { _id: id });
    const row = rows.find(item => item.id === id);
    if (!row) throw new Error(Model.modelName + ' document no longer exists.');
    const next = applyPatch(row.document, patch);
    next._id = id;
    addTimestamps(Model, next, false);
    validateSchema(Model.schema, next);
    if (await compareAndSwap(Model, row, next)) {
      document.__original = cloneValue(next);
      return document;
    }
  }
  throw new Error('Document changed concurrently. Reload it and retry the update.');
}

async function executeFind(Model, filter, queryOptions, one = false) {
  const rows = await loadRows(Model.modelName, filter);
  let documents = rows.filter(row => matchesFilter(row.document, filter)).map(row => row.document);
  if (queryOptions.sort) documents.sort((left, right) => compareDocuments(left, right, queryOptions.sort));
  if (queryOptions.skip) documents = documents.slice(Math.max(0, queryOptions.skip));
  if (queryOptions.limit != null) documents = documents.slice(0, Math.max(0, queryOptions.limit));
  if (one) return documents.length ? makeDocument(Model, documents[0], queryOptions) : null;
  return documents.map(document => makeDocument(Model, document, queryOptions));
}

async function executeFindOneAndUpdate(Model, filter, update, options, queryOptions, attempt = 0) {
  const rows = await loadRows(Model.modelName, filter);
  const candidates = rows.filter(row => matchesFilter(row.document, filter));
  if (queryOptions.sort) candidates.sort((left, right) => compareDocuments(left.document, right.document, queryOptions.sort));
  const row = candidates[0];
  if (!row) {
    if (!options.upsert) return null;
    const document = applySchemaDefaults(Model.schema, seedFromFilter(filter));
    const next = applyUpdate(document, update, true);
    addTimestamps(Model, next, true);
    if (options.runValidators) validateSchema(Model.schema, next);
    await insertRow(Model, next);
    const after = options.new === true || options.returnDocument === 'after';
    return after ? makeDocument(Model, next, queryOptions) : null;
  }
  const before = cloneValue(row.document);
  const next = applyUpdate(before, update, false);
  next._id = row.id;
  addTimestamps(Model, next, false);
  if (options.runValidators) validateSchema(Model.schema, next);
  if (!(await compareAndSwap(Model, row, next))) {
    if (attempt < 3) return executeFindOneAndUpdate(Model, filter, update, options, queryOptions, attempt + 1);
    throw new Error('Document changed concurrently. Retry the operation.');
  }
  const after = options.new === true || options.returnDocument === 'after' || options.returnOriginal === false;
  return makeDocument(Model, after ? next : before, queryOptions);
}

async function executeFindOneAndDelete(Model, filter, queryOptions) {
  const rows = await loadRows(Model.modelName, filter);
  const row = rows.find(item => matchesFilter(item.document, filter));
  if (!row) return null;
  await deleteRows(Model, [row]);
  return makeDocument(Model, row.document, queryOptions);
}

async function executeUpdate(Model, filter, update, options = {}, many = false) {
  const rows = await loadRows(Model.modelName, filter);
  const matches = rows.filter(row => matchesFilter(row.document, filter));
  const targets = many ? matches : matches.slice(0, 1);
  if (!targets.length && options.upsert) {
    const document = applySchemaDefaults(Model.schema, seedFromFilter(filter));
    const next = applyUpdate(document, update, true);
    addTimestamps(Model, next, true);
    if (options.runValidators) validateSchema(Model.schema, next);
    await insertRow(Model, next);
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: String(next._id) };
  }

  let modifiedCount = 0;
  for (const original of targets) {
    let current = original;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const next = applyUpdate(current.document, update, false);
      next._id = current.id;
      addTimestamps(Model, next, false);
      if (options.runValidators) validateSchema(Model.schema, next);
      if (await compareAndSwap(Model, current, next)) {
        modifiedCount += 1;
        break;
      }
      const latest = await loadRows(Model.modelName, { _id: current.id });
      const refreshed = latest.find(row => matchesFilter(row.document, filter));
      if (!refreshed) break;
      current = refreshed;
    }
  }
  return { acknowledged: true, matchedCount: targets.length, modifiedCount, upsertedId: null };
}

async function executeDelete(Model, filter, one = false) {
  const rows = await loadRows(Model.modelName, filter);
  const matches = rows.filter(row => matchesFilter(row.document, filter));
  return { acknowledged: true, deletedCount: await deleteRows(Model, one ? matches.slice(0, 1) : matches) };
}

class Query {
  constructor(executor) {
    this.executor = executor;
    this.database = getDatabase();
    this.options = { projection: null, lean: false, sort: null, limit: null, skip: 0 };
    this.promise = null;
  }
  select(specification) { this.options.projection = specification; return this; }
  lean() { this.options.lean = true; return this; }
  sort(specification) { this.options.sort = specification; return this; }
  limit(value) { this.options.limit = Number(value); return this; }
  skip(value) { this.options.skip = Number(value); return this; }
  populate() { return this; }
  setOptions() { return this; }
  exec() {
    if (!this.promise) {
      const execute = () => Promise.resolve().then(() => this.executor(this.options));
      this.promise = this.database ? databaseStorage.run(this.database, execute) : execute();
    }
    return this.promise;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
  finally(callback) { return this.exec().finally(callback); }
}

function createModel(name, schema) {
  const hiddenFields = Object.entries(schema.obj || {}).filter(([, definition]) => fieldInfo(definition).options?.select === false).map(([key]) => key);
  class Model {
    constructor(document = {}) {
      Object.assign(this, applySchemaDefaults(schema, document));
    }
    validateSync() {
      try { validateSchema(schema, this); return null; }
      catch (error) { return error; }
    }
    async validate() {
      const error = this.validateSync();
      if (error) throw error;
      return this;
    }
    async save() {
      await persistDocument(Model, this, null);
      return this;
    }
    static find(filter = {}, projection = null) {
      return new Query(options => executeFind(Model, filter, options, false)).select(projection);
    }
    static findOne(filter = {}, projection = null) {
      return new Query(options => executeFind(Model, filter, options, true)).select(projection);
    }
    static findById(id) {
      return new Query(options => executeFind(Model, { _id: String(id) }, options, true));
    }
    static countDocuments(filter = {}) {
      return new Query(async () => {
        const rows = await loadRows(name, filter);
        return rows.filter(row => matchesFilter(row.document, filter)).length;
      });
    }
    static findOneAndUpdate(filter, update, options = {}) {
      return new Query(queryOptions => executeFindOneAndUpdate(Model, filter, update, options, queryOptions));
    }
    static findOneAndDelete(filter) {
      return new Query(queryOptions => executeFindOneAndDelete(Model, filter, queryOptions));
    }
    static findByIdAndUpdate(id, update, options = {}) {
      return Model.findOneAndUpdate({ _id: String(id) }, update, options);
    }
    static findByIdAndDelete(id) {
      return Model.findOneAndDelete({ _id: String(id) });
    }
    static updateOne(filter, update, options = {}) {
      return executeUpdate(Model, filter, update, options, false);
    }
    static updateMany(filter, update, options = {}) {
      return executeUpdate(Model, filter, update, options, true);
    }
    static deleteOne(filter) {
      return executeDelete(Model, filter, true);
    }
    static deleteMany(filter = {}) {
      return executeDelete(Model, filter, false);
    }
    static async create(document) {
      if (Array.isArray(document)) return Promise.all(document.map(item => Model.create(item)));
      const instance = new Model(document);
      await instance.save();
      return instance;
    }
    static async insertMany(documents = []) {
      return Promise.all(documents.map(document => Model.create(document)));
    }
    static exists(filter = {}) {
      return new Query(async () => {
        const rows = await loadRows(name, filter);
        const row = rows.find(item => matchesFilter(item.document, filter));
        return row ? { _id: row.id } : null;
      });
    }
    static async distinct(path, filter = {}) {
      const rows = await loadRows(name, filter);
      const values = [];
      for (const row of rows.filter(item => matchesFilter(item.document, filter))) {
        for (const value of flattenValues(getPathValues(row.document, String(path).split('.')))) {
          if (!values.some(existing => equalValues(existing, value))) values.push(value);
        }
      }
      return values;
    }
    static async syncIndexes() { return []; }
    static async init() { return Model; }
    static aggregate() { throw new Error('Aggregation pipelines are not supported by the D1 document adapter.'); }
  }
  Object.defineProperties(Model, {
    modelName: { value: name },
    schema: { value: schema },
    hiddenFields: { value: hiddenFields }
  });
  return Model;
}

const mongoose = {
  Schema,
  Types: { ObjectId },
  model: createModel,
  isValidObjectId: ObjectId.isValid,
  set() {},
  async connect() {},
  async disconnect() {}
};

export default mongoose;


const databaseStorage = new AsyncLocalStorage();

export function runWithDatabase(database, callback) {
  if (!database || typeof database.prepare !== 'function') {
    throw new Error('Cloudflare D1 binding "DB" is required for persistent storage.');
  }
  return databaseStorage.run(database, callback);
}

export function getDatabase() {
  return databaseStorage.getStore() || null;
}
