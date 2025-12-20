#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Creates a unique key for a parameter to identify duplicates
 * In OpenAPI, parameters with the same 'in' and 'name' are considered duplicates
 * regardless of schema differences.
 * @param {object} param - OpenAPI parameter object
 * @returns {string} - Unique key for the parameter
 */
function getParameterKey(param) {
  // If parameter has a $ref, use that as the key
  if (param.$ref) {
    return `$ref:${param.$ref}`;
  }
  
  // For OpenAPI, parameters with the same 'in' and 'name' are duplicates
  // regardless of schema differences
  const inValue = param.in || '';
  const name = param.name || '';
  
  if (!inValue || !name) {
    // Fallback: if missing in/name, use schema comparison
    const schemaKey = param.schema?.$ref 
      ? `schema:$ref:${param.schema.$ref}`
      : JSON.stringify(param.schema || {});
    return `${inValue}:${name}:${schemaKey}`;
  }
  
  return `${inValue}:${name}`;
}

/**
 * Deep comparison of two schemas (ignoring property order)
 * @param {object} schema1 - First schema
 * @param {object} schema2 - Second schema
 * @returns {boolean} - True if schemas are equivalent
 */
function schemasEqual(schema1, schema2) {
  if (!schema1 && !schema2) return true;
  if (!schema1 || !schema2) return false;
  
  // Compare $ref first
  if (schema1.$ref || schema2.$ref) {
    return schema1.$ref === schema2.$ref;
  }
  
  // Deep comparison of schema properties
  return JSON.stringify(schema1) === JSON.stringify(schema2);
}

/**
 * Checks if two parameters are duplicates
 * @param {object} param1 - First parameter
 * @param {object} param2 - Second parameter
 * @returns {boolean} - True if parameters are duplicates
 */
function areParametersEqual(param1, param2) {
  // Compare $ref first
  if (param1.$ref || param2.$ref) {
    return param1.$ref === param2.$ref;
  }
  
  // Compare in, name, and schema
  return (
    param1.in === param2.in &&
    param1.name === param2.name &&
    schemasEqual(param1.schema, param2.schema)
  );
}

/**
 * Determines which parameter to keep when duplicates are found
 * Prefers the more complete parameter (more properties, enum values, etc.)
 * @param {object} param1 - First parameter
 * @param {object} param2 - Second parameter
 * @returns {object} - The parameter to keep
 */
function chooseBetterParameter(param1, param2) {
  // Prefer parameter with $ref (component reference)
  if (param1.$ref && !param2.$ref) return param1;
  if (param2.$ref && !param1.$ref) return param2;
  
  // Prefer parameter with more schema properties (enum, description, etc.)
  const schema1Keys = param1.schema ? Object.keys(param1.schema).length : 0;
  const schema2Keys = param2.schema ? Object.keys(param2.schema).length : 0;
  if (schema1Keys > schema2Keys) return param1;
  if (schema2Keys > schema1Keys) return param2;
  
  // Prefer parameter with description
  if (param1.description && !param2.description) return param1;
  if (param2.description && !param1.description) return param2;
  
  // Prefer parameter with more properties overall
  const keys1 = Object.keys(param1).length;
  const keys2 = Object.keys(param2).length;
  if (keys1 > keys2) return param1;
  if (keys2 > keys1) return param2;
  
  // Default to first parameter
  return param1;
}

/**
 * Deduplicates an array of parameters
 * @param {Array} parameters - Array of parameter objects
 * @returns {Array} - Deduplicated array of parameters
 */
function deduplicateParameters(parameters) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return parameters || [];
  }
  
  const seen = new Map();
  const result = [];
  
  for (const param of parameters) {
    const key = getParameterKey(param);
    
    // Check if we've seen this parameter before
    if (!seen.has(key)) {
      seen.set(key, param);
      result.push(param);
    } else {
      // We found a duplicate - choose the better one and replace it
      const existing = seen.get(key);
      const better = chooseBetterParameter(existing, param);
      
      if (better !== existing) {
        // Replace the existing parameter with the better one
        const index = result.indexOf(existing);
        if (index !== -1) {
          result[index] = better;
          seen.set(key, better);
        }
      }
      // If existing is better, we just skip the current param
    }
  }
  
  return result;
}

/**
 * Processes a single operation (get, post, put, delete, patch, etc.)
 * @param {object} operation - Operation object
 * @param {Array} pathParameters - Path-level parameters
 * @returns {object} - Operation with deduplicated parameters
 */
function processOperation(operation, pathParameters = []) {
  if (!operation) {
    return operation;
  }
  
  // Merge path-level and operation-level parameters
  const allParameters = [
    ...(pathParameters || []),
    ...(operation.parameters || [])
  ];
  
  // Deduplicate the merged parameters
  operation.parameters = deduplicateParameters(allParameters);
  
  // If no parameters after deduplication, remove the property
  if (operation.parameters.length === 0) {
    delete operation.parameters;
  }
  
  return operation;
}

/**
 * Processes all paths in the OpenAPI spec
 * @param {object} spec - OpenAPI specification object
 * @returns {object} - Processed OpenAPI specification
 */
function processOpenAPISpec(spec) {
  if (!spec.paths) {
    return spec;
  }
  
  const processedSpec = JSON.parse(JSON.stringify(spec));
  
  // Process each path
  for (const [path, pathItem] of Object.entries(processedSpec.paths)) {
    if (!pathItem) continue;
    
    // Handle non-standard "search" method: rename to "post" or drop if "post" exists
    if (pathItem.search) {
      if (!pathItem.post) {
        // Rename "search" to "post" if "post" doesn't exist
        pathItem.post = pathItem.search;
        delete pathItem.search;
        console.log(`  Renamed "search" to "post" in path: ${path}`);
      } else {
        // Drop "search" if "post" already exists
        delete pathItem.search;
        console.log(`  Dropped "search" method (post already exists) in path: ${path}`);
      }
    }
    
    // Get path-level parameters
    const pathParameters = pathItem.parameters || [];
    
    // Process each HTTP method
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
    for (const method of httpMethods) {
      if (pathItem[method]) {
        pathItem[method] = processOperation(pathItem[method], pathParameters);
      }
    }
    
    // Remove path-level parameters since they're now merged into operations
    // (This is optional - you might want to keep them for documentation)
    // delete pathItem.parameters;
  }
  
  return processedSpec;
}

/**
 * Main function
 */
function main() {
  const inputPath = join(rootDir, 'api', 'openapi.raw.json');
  const outputPath = join(rootDir, 'api', 'openapi.public.json');
  
  console.log(`Reading OpenAPI spec from: ${inputPath}`);
  
  try {
    // Read the raw OpenAPI file
    const rawContent = readFileSync(inputPath, 'utf8');
    const spec = JSON.parse(rawContent);
    
    console.log('Processing OpenAPI spec...');
    
    // Process the spec to deduplicate parameters
    const processedSpec = processOpenAPISpec(spec);
    
    console.log(`Writing processed OpenAPI spec to: ${outputPath}`);
    
    // Write the processed spec (pretty-printed for readability)
    writeFileSync(
      outputPath,
      JSON.stringify(processedSpec, null, 2),
      'utf8'
    );
    
    console.log('✅ Successfully deduplicated OpenAPI parameters!');
    
    // Count parameters before and after for reporting
    let totalParamsBefore = 0;
    let totalParamsAfter = 0;
    
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      const pathParams = (pathItem.parameters || []).length;
      for (const method of ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace']) {
        if (pathItem[method]?.parameters) {
          totalParamsBefore += pathParams + pathItem[method].parameters.length;
        }
      }
    }
    
    for (const [path, pathItem] of Object.entries(processedSpec.paths || {})) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace']) {
        if (pathItem[method]?.parameters) {
          totalParamsAfter += pathItem[method].parameters.length;
        }
      }
    }
    
    console.log(`📊 Parameters before: ${totalParamsBefore}, after: ${totalParamsAfter} (removed ${totalParamsBefore - totalParamsAfter} duplicates)`);
    
  } catch (error) {
    console.error('❌ Error processing OpenAPI spec:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

