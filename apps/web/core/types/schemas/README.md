# Zod Schema Validation for Ever Teams

This directory contains Zod schemas for validating API response data in the Ever Teams Next.js application. The schemas ensure type safety and data integrity by validating all API responses against predefined structures.

## Overview

The schema validation system provides:
- **Type Safety**: Ensures API responses match expected TypeScript types
- **Runtime Validation**: Catches data inconsistencies at runtime
- **Error Handling**: Provides clear error messages for validation failures
- **Consistency**: Standardizes validation across all API endpoints

## Directory Structure

```
schemas/
├── common/
│   └── base.schema.ts          # Base schemas for common interfaces
├── role/
│   └── role.schema.ts          # Role-related schemas
├── tag/
│   └── tag.schema.ts           # Tag-related schemas
├── utils/
│   └── validation.ts           # Validation utility functions
├── index.ts                    # Central export file
└── README.md                   # This documentation
```

## Usage

### 1. Basic Schema Validation

```typescript
import { roleSchema, validateApiResponse } from '@/core/types/schemas';

// Validate API response data
const response = await fetch('/api/roles/123');
const data = await response.json();

try {
  const validatedRole = validateApiResponse(roleSchema, data, 'role API');
  console.log('Valid role:', validatedRole);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### 2. Using Validated Services

```typescript
import { validatedRoleService } from '@/core/services/client/api/roles/role-validated.service';

// All responses are automatically validated
try {
  const roles = await validatedRoleService.getRoles();
  // roles is guaranteed to match the Role schema
} catch (ValidationError) {
  // Handle validation errors
}
```

### 3. Safe Parsing (No Exceptions)

```typescript
import { roleSchema, zodSafeParse } from '@/core/types/schemas';

const result = zodSafeParse(roleSchema, apiData);

if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.error('Validation error:', result.error.message);
}
```

### 4. Pagination Response Validation

```typescript
import { validatePaginationResponse, tagSchema } from '@/core/types/schemas';

const paginatedTags = validatePaginationResponse(
  tagSchema,
  apiResponse,
  'tags pagination'
);
```

## Available Schemas

### Base Schemas (`common/base.schema.ts`)
- `idSchema` - String ID validation
- `baseEntitySchema` - Common entity properties
- `basePerTenantEntityModelSchema` - Tenant-scoped entities
- `basePerTenantAndOrganizationEntityModelSchema` - Org + tenant scoped entities

### Role Schemas (`role/role.schema.ts`)
- `roleSchema` - Main role interface validation
- `rolePermissionSchema` - Role permission validation
- `roleListSchema` - Role list API response validation
- `roleNameSchema` - Role name enum validation

### Tag Schemas (`tag/tag.schema.ts`)
- `tagSchema` - Main tag interface validation
- `tagTypeSchema` - Tag type validation
- `tagCreateSchema` - Tag creation input validation

## Validation Utilities

### Core Functions
- `zodParse<T>(schema, data, context?)` - Parse with exceptions
- `zodSafeParse<T>(schema, data)` - Parse without exceptions
- `validateApiResponse<T>(schema, data, context?)` - Validate single response
- `validatePaginationResponse<T>(itemSchema, data, context?)` - Validate paginated response

### Error Handling
- `ValidationError` - Custom error class with detailed issue information
- `formatValidationError(error)` - Format errors for user display

## Integration with Existing Services

### Option 1: Use Validated Services (Recommended)
Replace existing service imports with validated versions:

```typescript
// Before
import { roleService } from '@/core/services/client/api/roles/role.service';

// After
import { validatedRoleService as roleService } from '@/core/services/client/api/roles/role-validated.service';
```

### Option 2: Add Validation to Existing Services
Modify existing services to include validation:

```typescript
import { validateApiResponse, roleSchema } from '@/core/types/schemas';

class RoleService extends APIService {
  getRoles = async () => {
    const response = await this.get<PaginationResponse<IRole>>('/roles');
    return validatePaginationResponse(roleSchema, response.data, 'getRoles');
  };
}
```

## Best Practices

### 1. Always Use Context
Provide context in validation calls for better error messages:

```typescript
validateApiResponse(schema, data, 'user profile API response');
```

### 2. Handle Validation Errors Gracefully
```typescript
try {
  const data = validateApiResponse(schema, response);
  return data;
} catch (error) {
  if (error instanceof ValidationError) {
    // Log detailed validation issues
    console.error('Validation failed:', error.issues);
    // Show user-friendly message
    showErrorToast('Data validation failed. Please try again.');
  }
  throw error;
}
```

### 3. Use Strict Schemas
All schemas use `.strict()` to prevent unexpected properties:

```typescript
const schema = z.object({
  name: z.string(),
  id: z.string()
}).strict(); // Rejects extra properties
```

### 4. Validate Input Data
Validate data before sending to APIs:

```typescript
const createTag = async (data: TagCreate) => {
  const validatedInput = validateApiResponse(tagCreateSchema, data, 'tag creation input');
  return this.post('/tags', validatedInput);
};
```

## Error Examples

### Validation Error Output
```
ValidationError: Validation failed in getRoles API response: 
  items.0.name: Required, 
  items.1.isSystem: Expected boolean, received string
```

### Handling in UI
```typescript
catch (error) {
  if (error instanceof ValidationError) {
    const userMessage = formatValidationError(error);
    showErrorDialog('Data Validation Error', userMessage);
  }
}
```

## Extending Schemas

### Adding New Entity Schemas
1. Create schema file: `schemas/{entity}/{entity}.schema.ts`
2. Define Zod schemas based on existing interfaces
3. Export TypeScript types using `z.infer<>`
4. Add exports to `schemas/index.ts`
5. Create validated service if needed

### Schema Naming Convention
- Schema: `{entity}Schema` (e.g., `userSchema`)
- Type: `{Entity}` (e.g., `User`)
- Create schema: `{entity}CreateSchema`
- Update schema: `{entity}UpdateSchema`

## Performance Considerations

- Validation adds minimal overhead (~1-2ms per response)
- Schemas are compiled once and reused
- Use caching for frequently validated data
- Consider disabling validation in production if performance is critical

## Migration Guide

1. **Install Dependencies**: Zod is already installed
2. **Import Schemas**: Use schemas from `@/core/types/schemas`
3. **Replace Services**: Gradually replace with validated services
4. **Add Error Handling**: Implement ValidationError handling
5. **Test Thoroughly**: Ensure all API responses validate correctly
