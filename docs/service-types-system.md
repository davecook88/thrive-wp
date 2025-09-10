# Service Types System Documentation

## Overview

The Thrive WP application uses a centralized **ServiceType** system to ensure consistent class/service type definitions across the entire codebase. This system replaces the previous inconsistent naming and provides runtime validation.

## Core Components

### ServiceType Enum (`nestjs/src/common/types/class-types.ts`)

The primary enum defining the three service types:

```typescript
export enum ServiceType {
  PRIVATE = 'PRIVATE',  // One-to-one individual sessions
  GROUP = 'GROUP',      // Group classes with enrollment limits
  COURSE = 'COURSE',    // Multi-session programs with curriculum
}
```

### ServiceKey Enum (for Stripe Integration)

Service keys used for Stripe product mappings:

```typescript
export enum ServiceKey {
  PRIVATE_CLASS = 'PRIVATE_CLASS',  // Maps to Stripe products for private sessions
  GROUP_CLASS = 'GROUP_CLASS',      // Maps to Stripe products for group classes
  COURSE_CLASS = 'COURSE_CLASS',    // Maps to Stripe products for courses
}
```

## Usage Across the Application

### Backend (NestJS)
- **Session Entity**: Uses `ServiceType` enum for the `type` column
- **Payments Service**: Uses `ServiceKey.PRIVATE_CLASS` for Stripe product lookups
- **DTOs**: Include Zod validation schemas for runtime type checking

### Frontend (WordPress & Web Components)
- **Type Definitions**: Use string literals `"PRIVATE" | "GROUP" | "COURSE"`
- **Calendar Events**: Include `classType` property matching ServiceType values
- **Type Safety**: Compile-time validation ensures consistency

### Database
- **Migration Files**: Store enum values as strings (`'PRIVATE'`, `'GROUP'`, `'COURSE'`)
- **Stripe Product Map**: Uses ServiceKey values for product identification

## Validation & Type Safety

### Zod Schemas
```typescript
import { ServiceTypeSchema, ServiceKeySchema } from '../common/types/class-types.js';

// Validate ServiceType
const result = ServiceTypeSchema.safeParse('PRIVATE');
if (!result.success) {
  throw new Error('Invalid service type');
}
```

### Type Guards
```typescript
import { isServiceType, isServiceKey } from '../common/types/class-types.js';

if (isServiceType(someValue)) {
  // TypeScript knows someValue is ServiceType
}
```

### Conversion Utilities
```typescript
import { serviceTypeToServiceKey, serviceKeyToServiceType } from '../common/types/class-types.js';

const serviceKey = serviceTypeToServiceKey(ServiceType.PRIVATE); // Returns ServiceKey.PRIVATE_CLASS
const serviceType = serviceKeyToServiceType(ServiceKey.PRIVATE_CLASS); // Returns ServiceType.PRIVATE
```

## Migration from Previous System

### What Changed
- `ClassType` → `ServiceType` (enum name)
- `classTypeToServiceKey()` → `serviceTypeToServiceKey()` (function name)
- `'ONE_TO_ONE_CLASS'` → `'PRIVATE_CLASS'` (service key value)
- `SESSION:ONE_TO_ONE:...` → `SESSION:PRIVATE:...` (price key format)

### Files Updated
- `nestjs/src/common/types/class-types.ts` - Core type definitions
- `nestjs/src/sessions/entities/session.entity.ts` - Database entity
- `nestjs/src/payments/payments.service.ts` - Payment processing
- `nestjs/src/payments/dto/create-payment-intent.dto.ts` - Input validation
- `web-components/thrive-calendar/src/types.ts` - Frontend types
- `wordpress/themes/custom-theme/types/calendar.ts` - WordPress types
- Various documentation files

## Benefits

1. **Consistency**: Single source of truth for all service type definitions
2. **Type Safety**: Compile-time and runtime validation prevent errors
3. **Maintainability**: Easy to add new service types or modify existing ones
4. **Integration**: Seamless mapping between frontend, backend, and payment systems
5. **Documentation**: Clear naming conventions and comprehensive validation

## Future Extensions

The ServiceType system is designed to be easily extensible:

- Add new service types by extending the enum
- Update mappings in `ServiceTypeToServiceKey`
- Add corresponding Zod validation
- Update frontend type definitions
- Create database migrations for new types

## DTO Validation with nestjs-zod

The application uses `nestjs-zod` for streamlined DTO validation:

### Global Setup
```typescript
// src/app.module.ts
import { ZodValidationPipe } from 'nestjs-zod';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
```

### Zod DTOs
```typescript
// DTO definition
export const CreatePaymentIntentSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  teacher: z.number().int().positive(),
  serviceType: z.nativeEnum(ServiceType),
  notes: z.string().optional(),
});

export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;
```

### Controller Usage
```typescript
@Post('payment-intent')
createPaymentIntent(
  @Body(new ZodValidationPipe(CreatePaymentIntentSchema))
  createPaymentIntentDto: CreatePaymentIntentDto,
  @Request() req: ExpressRequest,
): Promise<CreatePaymentIntentResponse>
```

### Benefits
- **Automatic Validation**: Global pipe validates all incoming requests
- **Type Safety**: Compile-time validation with TypeScript
- **Runtime Safety**: Zod schemas catch invalid data at runtime
- **Error Handling**: Automatic error responses for invalid data
- **Performance**: Efficient validation with detailed error messages
