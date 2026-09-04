# Fluyo: Semantic Enrichment — bio-core-motofleet

Fill the `Purpose` column for each entity below.
Rules:
- 1 sentence, business-focused (what problem it solves, not how it works)
- Max 80 characters
- Use `-` only for pure config/utility files with no business purpose
- Return the complete index.toon with Purpose values filled, inside a ```toon block

## Entities to enrich (new or unenriched)
- node_routes: src/routes/auth.routes.ts#POST:/login
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contracts/:contractId/signature-case
- node_routes: src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/review
- node_routes: src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/original
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/send
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/resend
- node_routes: src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/attempts
- node_routes: src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/audit
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/review/start
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/verify
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/approve
- node_routes: src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/reject
- node_routes: src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/versions/:versionId/download
- node_routes: src/routes/contract-signature.public.routes.ts#POST:/:token/signed
- node_routes: src/routes/contract-signature.public.routes.ts#GET:/:token/original
- node_routes: src/routes/contract-signature.public.routes.ts#GET:/:token
- node_routes: src/routes/contract.routes.ts#GET:/
- node_routes: src/routes/contract.routes.ts#POST:/
- node_routes: src/routes/contract.routes.ts#PATCH:/:id/cancel
- node_routes: src/routes/contract.routes.ts#PATCH:/:id/renew
- node_routes: src/routes/cosigner.routes.ts#GET:/:riderId/cosigners
- node_routes: src/routes/cosigner.routes.ts#POST:/:riderId/cosigners
- node_routes: src/routes/cosigner.routes.ts#PUT:/cosigners/:id
- node_routes: src/routes/errand.routes.ts#POST:/route-estimate
- node_routes: src/routes/errand.routes.ts#POST:/quote
- node_routes: src/routes/errand.routes.ts#POST:/
- node_routes: src/routes/errand.routes.ts#GET:/available
- node_routes: src/routes/errand.routes.ts#GET:/my
- node_routes: src/routes/errand.routes.ts#GET:/:id/route-preview
- node_routes: src/routes/errand.routes.ts#PATCH:/:id/accept
- node_routes: src/routes/errand.routes.ts#PATCH:/:id/pickup
- node_routes: src/routes/errand.routes.ts#PATCH:/:id/deliver
- node_routes: src/routes/errand.routes.ts#PATCH:/:id/cancel
- node_routes: src/routes/metrics.routes.ts#GET:/metrics
- node_routes: src/routes/metrics.routes.ts#GET:/errands
- node_routes: src/routes/metrics.routes.ts#GET:/riders
- node_routes: src/routes/metrics.routes.ts#GET:/riders-select
- node_routes: src/routes/metrics.routes.ts#GET:/motorcycles-select
- node_routes: src/routes/metrics.routes.ts#PATCH:/riders/:id/availability
- node_routes: src/routes/motorcycle.routes.ts#GET:/
- node_routes: src/routes/motorcycle.routes.ts#POST:/
- node_routes: src/routes/motorcycle.routes.ts#PUT:/:id
- node_routes: src/routes/motorcycle.routes.ts#PATCH:/:id/status
- node_routes: src/routes/notification.routes.ts#GET:/
- node_routes: src/routes/notification.routes.ts#GET:/unread-count
- node_routes: src/routes/notification.routes.ts#PATCH:/read-all
- node_routes: src/routes/notification.routes.ts#PATCH:/:id/read
- node_routes: src/routes/notification.routes.ts#DELETE:/:id
- node_routes: src/routes/payment.routes.ts#GET:/:contractId/payments
- node_routes: src/routes/payment.routes.ts#POST:/:contractId/payments
- node_routes: src/routes/pricing.routes.ts#GET:/
- node_routes: src/routes/pricing.routes.ts#POST:/
- node_routes: src/routes/pricing.routes.ts#PATCH:/:id/deactivate
- node_routes: src/routes/rider.routes.ts#POST:/register
- node_routes: src/routes/rider.routes.ts#PATCH:/me/availability
- node_routes: src/routes/user.routes.ts#POST:/register
- biocore_application_components: MoleculeContainer
- biocore_application_components: createApp
- biocore_application_components: getCurrentUtcTimestamp
- biocore_application_components: getCurrentUtcTimestampSqlite
- biocore_application_components: toUtcIso
- biocore_application_components: toUtcSqlite
- biocore_application_components: normalizeDocumentFilename
- biocore_application_components: toRadians
- biocore_application_components: haversineDistance
- biocore_application_components: hashPassword
- biocore_application_components: verifyPassword
- biocore_application_components: isValidPassword
- biocore_application_components: LoginInput
- biocore_application_components: loginSchema
- biocore_application_components: emailSchema
- biocore_application_components: phoneSchema
- biocore_application_components: passwordSchema
- biocore_application_components: futureDateSchema
- biocore_application_components: latitudeSchema
- biocore_application_components: longitudeSchema
- biocore_application_components: CreateContractInput
- biocore_application_components: createContractSchema
- biocore_application_components: SignatureCaseParams
- biocore_application_components: ContractSignatureCaseParams
- biocore_application_components: DocumentVersionParams
- biocore_application_components: PublicSignatureLinkParams
- biocore_application_components: ManualVerificationInput
- biocore_application_components: ApprovalInput
- biocore_application_components: RejectionInput
- biocore_application_components: ReviewQueueQuery
- biocore_application_components: AuditPaginationQuery
- biocore_application_components: uuidSchema
- biocore_application_components: signatureCaseIdSchema
- biocore_application_components: documentVersionIdSchema
- biocore_application_components: signatureLinkTokenSchema
- biocore_application_components: signatureCaseParamsSchema
- biocore_application_components: contractSignatureCaseParamsSchema
- biocore_application_components: documentVersionParamsSchema
- biocore_application_components: publicSignatureLinkParamsSchema
- biocore_application_components: reviewStartSchema
- biocore_application_components: manualVerificationSchema
- biocore_application_components: approvalSchema
- biocore_application_components: rejectionSchema
- biocore_application_components: reviewQueueQuerySchema
- biocore_application_components: auditPaginationQuerySchema
- biocore_application_components: signatureCaseDetailQuerySchema
- biocore_application_components: CreateCosignerInput
- biocore_application_components: createCosignerSchema
- biocore_application_components: CreateErrandInput
- biocore_application_components: RouteEstimateRequest
- biocore_application_components: routeCoordinatesSchema
- biocore_application_components: routeEstimateRequestSchema
- biocore_application_components: quoteErrandRequestSchema
- biocore_application_components: createErrandSchema
- biocore_application_components: index
- biocore_application_components: CreateMotorcycleInput
- biocore_application_components: createMotorcycleSchema
- biocore_application_components: CreatePaymentInput
- biocore_application_components: createPaymentSchema
- biocore_application_components: must
- biocore_application_components: CreatePricingRuleInput
- biocore_application_components: createPricingRuleSchema
- biocore_application_components: RiderDocumentType
- biocore_application_components: must
- biocore_application_components: CreateRiderInput
- biocore_application_components: riderDocumentTypes
- biocore_application_components: documentTypeSchema
- biocore_application_components: documentNumberSchema
- biocore_application_components: createRiderSchema
- biocore_application_components: CreateUserInput
- biocore_application_components: createUserSchema
- biocore_application_components: schemas
- biocore_application_components: MotorcycleState
- biocore_application_components: ContractState
- biocore_application_components: ErrandState
- biocore_application_components: isValidMotorcycleTransition
- biocore_application_components: isValidContractTransition
- biocore_application_components: isValidErrandTransition
- biocore_application_components: getValidMotorcycleTransitions
- biocore_application_components: getValidErrandTransitions
- biocore_application_components: PricingInput
- biocore_application_components: PricingResult
- biocore_application_components: roundHalfUp
- biocore_application_components: assertSafeInteger
- biocore_application_components: calculateFare
- biocore_application_components: DocumentStatus
- biocore_application_components: FormalizationStatus
- biocore_application_components: DeliveryAttention
- biocore_application_components: DocumentVersionKind
- biocore_application_components: DocumentStorageStatus
- biocore_application_components: ContractSignatureActorType
- biocore_application_components: VerificationResult
- biocore_application_components: DeliveryStatus
- biocore_application_components: OutboxStatus
- biocore_application_components: ContractEmailEventType
- biocore_application_components: ContractAuditEventType
- biocore_application_components: AuditResult
- biocore_application_components: PdfValidationCode
- biocore_application_components: PdfValidationError
- biocore_application_components: getValidDocumentTransitions
- biocore_application_components: isValidDocumentTransition
- biocore_application_components: getValidFormalizationTransitions
- biocore_application_components: isValidFormalizationTransition
- biocore_application_components: ContractSignatureStateConflictError
- biocore_application_components: assertDocumentTransition
- biocore_application_components: assertFormalizationTransition
- biocore_application_components: DOCUMENT_STATUSES
- biocore_application_components: FORMALIZATION_STATUSES
- biocore_application_components: DELIVERY_ATTENTIONS
- biocore_application_components: DOCUMENT_VERSION_KINDS
- biocore_application_components: DOCUMENT_STORAGE_STATUSES
- biocore_application_components: CONTRACT_SIGNATURE_ACTOR_TYPES
- biocore_application_components: VERIFICATION_RESULTS
- biocore_application_components: DELIVERY_STATUSES
- biocore_application_components: OUTBOX_STATUSES
- biocore_application_components: CONTRACT_EMAIL_EVENT_TYPES
- biocore_application_components: CONTRACT_AUDIT_EVENT_TYPES
- biocore_application_components: AUDIT_RESULTS
- biocore_application_components: PDF_VALIDATION_CODES
- biocore_application_components: RouteEstimateRequest
- biocore_application_components: RouteEstimateResponse
- biocore_application_components: RoutingProviderName
- biocore_application_components: RoutingProfile
- biocore_application_components: Coordinates
- biocore_application_components: RouteGeometry
- biocore_application_components: RouteEstimate
- biocore_application_components: RoutingProvider
- biocore_application_components: to
- biocore_application_components: DomainError
- biocore_application_components: NotFoundError
- biocore_application_components: ValidationError
- biocore_application_components: BusinessRuleViolation
- biocore_application_components: InvalidStateTransition
- biocore_application_components: ForbiddenError
- biocore_application_components: UnauthorizedError
- biocore_application_components: ConflictError
- biocore_application_components: Database
- biocore_application_components: MoleculeContainer
- biocore_application_components: ApplicationStartupStep
- biocore_application_components: ApplicationOptions
- biocore_application_components: ApplicationRuntime
- biocore_application_components: guarantees
- biocore_application_components: createApplication
- biocore_application_components: main
- biocore_application_components: DownloadableStatus
- biocore_application_components: BackupCapacityEstimate
- biocore_application_components: BackupVersionEntry
- biocore_application_components: BackupObjectEntry
- biocore_application_components: BackupManifest
- biocore_application_components: BackupRestoreIncident
- biocore_application_components: RestoreActivationContext
- biocore_application_components: RestoreOptions
- biocore_application_components: RestoreReport
- biocore_application_components: BackupCoordinatorOptions
- biocore_application_components: VersionRow
- biocore_application_components: RestoreVersionRow
- biocore_application_components: VersionIssue
- biocore_application_components: BackupInventory
- biocore_application_components: BackupCoordinatorError
- biocore_application_components: BackupIntegrityError
- biocore_application_components: BackupCoordinator
- biocore_application_components: isCapacityGuard
- biocore_application_components: isDownloadableStatus
- biocore_application_components: assertStorageKey
- biocore_application_components: assertMetadataMatches
- biocore_application_components: assertUniqueVersionReferences
- biocore_application_components: assertUniqueObjects
- biocore_application_components: toManifestVersion
- biocore_application_components: toManifestObject
- biocore_application_components: readVersionRows
- biocore_application_components: readRestoreVersionRows
- biocore_application_components: assertSameVersionSnapshot
- biocore_application_components: fingerprintVersions
- biocore_application_components: validateManifestVersion
- biocore_application_components: duplicateRowsByKey
- biocore_application_components: groupManifestEntries
- biocore_application_components: copyStorageObject
- biocore_application_components: copyReadableExclusive
- biocore_application_components: copyFileExclusive
- biocore_application_components: fileMetadata
- biocore_application_components: writeClosedManifest
- biocore_application_components: readClosedManifest
- biocore_application_components: prepareEmptyDirectory
- biocore_application_components: safeManifestPath
- biocore_application_components: safeManifestObjectPath
- biocore_application_components: restoreReason
- biocore_application_components: normalizeBackupError
- biocore_application_components: isRecord
- biocore_application_components: defaultWriteWindow
- biocore_application_components: assertBackupComponents
- biocore_application_components: Database
- biocore_application_components: AuditResult
- biocore_application_components: ContractAuditEventType
- biocore_application_components: ContractSignatureActorType
- biocore_application_components: ContractAuditActor
- biocore_application_components: RecordContractAuditEventInput
- biocore_application_components: ContractAuditEvent
- biocore_application_components: ContractAuditPage
- biocore_application_components: ContractAuditServiceOptions
- biocore_application_components: ContractAuditEventRow
- biocore_application_components: AuditCursor
- biocore_application_components: ContractAuditService
- biocore_application_components: sanitizeAuditMetadata
- biocore_application_components: sanitizeObject
- biocore_application_components: sanitizeValue
- biocore_application_components: normalizeErrorCode
- biocore_application_components: sanitizeErrorMessage
- biocore_application_components: parseMetadata
- biocore_application_components: normalizeLimit
- biocore_application_components: encodeCursor
- biocore_application_components: decodeCursor
- biocore_application_components: RepositoryCapacityStatus
- biocore_application_components: CapacityGuard
- biocore_application_components: RepositoryConfigurationError
- biocore_application_components: RepositoryCapacityError
- biocore_application_components: RepositoryCapacityMonitorOptions
- biocore_application_components: RepositoryCapacityMonitor
- biocore_application_components: ContractDocumentRepositoryConfiguration
- biocore_application_components: parsePositiveInteger
- biocore_application_components: parseThresholds
- biocore_application_components: readContractDocumentRepositoryConfiguration
- biocore_application_components: DEFAULT_CAPACITY_THRESHOLDS
- biocore_application_components: Database
- biocore_application_components: ContractEmailEventType
- biocore_application_components: ContractEmailProcessingError
- biocore_application_components: ContractEmailServiceOptions
- biocore_application_components: ContractEmailQueueRow
- biocore_application_components: RenderedContractEmail
- biocore_application_components: ContractEmailSendResult
- biocore_application_components: ContractEmailPayload
- biocore_application_components: ContractEmailService
- biocore_application_components: html
- biocore_application_components: are
- biocore_application_components: isContractEmailEventType
- biocore_application_components: asPayload
- biocore_application_components: requiredText
- biocore_application_components: optionalText
- biocore_application_components: normalizeDynamicText
- biocore_application_components: normalizeIdentifier
- biocore_application_components: normalizeCiphertext
- biocore_application_components: normalizeRecipient
- biocore_application_components: normalizeHeader
- biocore_application_components: normalizeBaseUrl
- biocore_application_components: safeLink
- biocore_application_components: escapeHtml
- biocore_application_components: plainText
- biocore_application_components: parsePort
- biocore_application_components: Database
- biocore_application_components: ProcessingStatus
- biocore_application_components: ContractEmailQueueDbRow
- biocore_application_components: ClaimedEmail
- biocore_application_components: ContractEmailWorkerOptions
- biocore_application_components: ContractEmailDeliveryPort
- biocore_application_components: ContractEmailWorker
- biocore_application_components: toQueueInput
- biocore_application_components: normalizePositiveMinutes
- biocore_application_components: normalizePositiveInteger
- biocore_application_components: readProcessingTimeoutMinutes
- biocore_application_components: CONTRACT_EMAIL_MAX_ATTEMPTS
- biocore_application_components: CONTRACT_EMAIL_RETRY_DELAY_MS
- biocore_application_components: DEFAULT_PROCESSING_TIMEOUT_MINUTES
- biocore_application_components: Database
- biocore_application_components: ContractExpirationOutbox
- biocore_application_components: ContractSignatureSchedulerMetrics
- biocore_application_components: ContractSignatureSchedulerJobsOptions
- biocore_application_components: ContractSignatureSchedulerJobsDependencies
- biocore_application_components: ExpiredAttemptRow
- biocore_application_components: SignatureCaseRow
- biocore_application_components: QueueAdminRow
- biocore_application_components: ContractSignatureSchedulerJobs
- biocore_application_components: SchedulerIntervals
- biocore_application_components: readSchedulerIntervals
- biocore_application_components: readInterval
- biocore_application_components: readStorageRetentionPolicy
- biocore_application_components: readNonNegativeInterval
- biocore_application_components: readRetentionAction
- biocore_application_components: RegisterContractSignatureJobsOptions
- biocore_application_components: only
- biocore_application_components: registerContractSignatureJobs
- biocore_application_components: CONTRACT_EMAIL_WORKER_INTERVAL_MS
- biocore_application_components: CONTRACT_SIGNATURE_EXPIRATION_INTERVAL_MS
- biocore_application_components: DEFAULT_STORAGE_RECONCILIATION_INTERVAL_MS
- biocore_application_components: DEFAULT_STORAGE_CAPACITY_INTERVAL_MS
- biocore_application_components: DEFAULT_STORAGE_RETENTION_POLICY
- biocore_application_components: createDatabase
- biocore_application_components: runMigrations
- biocore_application_components: getDatabase
- biocore_application_components: closeDatabase
- biocore_application_components: DownloadableStorageStatus
- biocore_application_components: DocumentMetadata
- biocore_application_components: TemporaryDocument
- biocore_application_components: StoredDocument
- biocore_application_components: StoredDocumentEntry
- biocore_application_components: TemporaryDocumentEntry
- biocore_application_components: RetentionDeletionRequest
- biocore_application_components: DocumentStorage
- biocore_application_components: DocumentStorageError
- biocore_application_components: DocumentStorageLimitError
- biocore_application_components: createStorageKey
- biocore_application_components: createTemporaryKey
- biocore_application_components: isSafeKey
- biocore_application_components: isWithin
- biocore_application_components: PrivateFilesystemStorageOptions
- biocore_application_components: PrivateFilesystemDocumentStorage
- biocore_application_components: MAX_CONTRACT_DOCUMENT_BYTES
- biocore_application_components: S3ObjectClient
- biocore_application_components: DocumentStorageProvider
- biocore_application_components: ConfiguredDocumentStorage
- biocore_application_components: DocumentStorageFactoryOptions
- biocore_application_components: createConfiguredDocumentStorage
- biocore_application_components: createConfiguredS3DocumentStorage
- biocore_application_components: readProvider
- biocore_application_components: DocumentMetadata
- biocore_application_components: DocumentStorage
- biocore_application_components: DownloadableStorageStatus
- biocore_application_components: StorageReconciliationReport
- biocore_application_components: StorageRetentionPolicy
- biocore_application_components: VersionRow
- biocore_application_components: MigrationVersionResultStatus
- biocore_application_components: MigrationVersionResult
- biocore_application_components: DocumentStorageMigrationOptions
- biocore_application_components: DocumentStorageMigrationReport
- biocore_application_components: DocumentStorageMigration
- biocore_application_components: isDownloadableStorageStatus
- biocore_application_components: sameMetadata
- biocore_application_components: withSqliteWritesPaused
- biocore_application_components: emptyReconciliationReport
- biocore_application_components: PinoLogger
- biocore_application_components: PinoStream
- biocore_application_components: PinoFactory
- biocore_application_components: decoupled
- biocore_application_components: ILogger
- biocore_application_components: LoggerCore
- biocore_application_components: loggerLevel
- biocore_application_components: createLoggerCore
- biocore_application_components: createPostShutdownLogger
- biocore_application_components: LoggerRegistry
- biocore_application_components: startLoggerLifecycle
- biocore_application_components: shutdownLoggerLifecycle
- biocore_application_components: flushAndCloseTransport
- biocore_application_components: PinoLoggerAdapter
- biocore_application_components: createLogger
- biocore_application_components: MultipartUploadErrorCode
- biocore_application_components: MultipartUploadError
- biocore_application_components: MultipartFileUpload
- biocore_application_components: parseSingleMultipartFile
- biocore_application_components: parseMultipartBody
- biocore_application_components: extractBoundary
- biocore_application_components: parseHeaders
- biocore_application_components: getParameter
- biocore_application_components: invalidMultipart
- biocore_application_components: PdfValidationCode
- biocore_application_components: PdfValidationInput
- biocore_application_components: ValidatedPdf
- biocore_application_components: PdfValidator
- biocore_application_components: normalizePdfMimeType
- biocore_application_components: hasPdfTrailer
- biocore_application_components: MAX_PDF_BYTES
- biocore_application_components: PDF_MIME_TYPE
- biocore_application_components: RoutingFailureReason
- biocore_application_components: MapboxRoutingError
- biocore_application_components: MapboxRequest
- biocore_application_components: MapboxDirectionsService
- biocore_application_components: MapboxDirectionsServiceFactory
- biocore_application_components: MapboxDirectionsResponse
- biocore_application_components: MapboxRoutingProvider
- biocore_application_components: DocumentMetadata
- biocore_application_components: DocumentStorage
- biocore_application_components: DownloadableStorageStatus
- biocore_application_components: RetentionDeletionRequest
- biocore_application_components: StoredDocument
- biocore_application_components: StoredDocumentEntry
- biocore_application_components: TemporaryDocument
- biocore_application_components: TemporaryDocumentEntry
- biocore_application_components: S3Directory
- biocore_application_components: S3ObjectClient
- biocore_application_components: S3ObjectInfo
- biocore_application_components: S3ListedObject
- biocore_application_components: S3CompatibleDocumentStorageOptions
- biocore_application_components: S3CompatibleDocumentStorage
- biocore_application_components: normalizePrefix
- biocore_application_components: createTemporaryKey
- biocore_application_components: assertStorageKey
- biocore_application_components: assertTemporaryKey
- biocore_application_components: assertRetentionExpired
- biocore_application_components: assertMetadata
- biocore_application_components: sameMetadata
- biocore_application_components: readBounded
- biocore_application_components: toReadable
- biocore_application_components: isConflict
- biocore_application_components: isNotFound
- biocore_application_components: normalizeStorageError
- biocore_application_components: S3ClientConfig
- biocore_application_components: AwsS3CompatibleClientOptions
- biocore_application_components: AwsS3CompatibleObjectClient
- biocore_application_components: createAwsS3CompatibleObjectClientFromEnvironment
- biocore_application_components: parseDate
- biocore_application_components: isNotFound
- biocore_application_components: SchedulerClock
- biocore_application_components: SchedulerTimerHandle
- biocore_application_components: SchedulerTimers
- biocore_application_components: SchedulerOptions
- biocore_application_components: ScheduledTask
- biocore_application_components: Scheduler
- biocore_application_components: isLogger
- biocore_application_components: readClock
- biocore_application_components: assertInterval
- biocore_application_components: Database
- biocore_application_components: RetentionAction
- biocore_application_components: StorageRetentionPolicy
- biocore_application_components: StorageReconcilerOptions
- biocore_application_components: StorageReconciliationReport
- biocore_application_components: VersionRow
- biocore_application_components: MutableStorageReconciliationReport
- biocore_application_components: StorageReconciler
- biocore_application_components: assertPolicy
- biocore_application_components: groupByKey
- biocore_application_components: parseDate
- biocore_application_components: isExpired
- biocore_application_components: Database
- biocore_application_components: GeneratedLinkToken
- biocore_application_components: ResolvedContractLink
- biocore_application_components: ContractLinkResolution
- biocore_application_components: DeliveryAttemptRow
- biocore_application_components: TokenServiceOptions
- biocore_application_components: TokenService
- biocore_application_components: applyPublicLinkSecurityHeaders
- biocore_application_components: sendPublicLinkResolutionError
- biocore_application_components: RateLimitResult
- biocore_application_components: TokenIpRateLimiter
- biocore_application_components: addCalendarDaysUtc
- biocore_application_components: normalizeEncryptionKey
- biocore_application_components: PublicLinkRateLimitStore
- biocore_application_components: PublicLinkRateLimiterOptions
- biocore_application_components: PublicLinkRateLimitDecision
- biocore_application_components: RateLimitEntry
- biocore_application_components: PublicLinkRateLimiter
- biocore_application_components: MapRateLimitStore
- biocore_application_components: LINK_TOKEN_BYTES
- biocore_application_components: LINK_EXPIRY_DAYS
- biocore_application_components: INVALID_LINK_RESPONSE
- biocore_application_components: Request
- biocore_application_components: authMiddleware
- biocore_application_components: optionalAuthMiddleware
- biocore_application_components: with
- biocore_application_components: AppError
- biocore_application_components: domainErrorToStatus
- biocore_application_components: formatZodError
- biocore_application_components: errorHandler
- biocore_application_components: appendContractSignatureStatuses
- biocore_application_components: that
- biocore_application_components: roleGuard
- biocore_application_components: ZodSchema
- biocore_application_components: that
- biocore_application_components: validate
- biocore_application_components: formatZodError
- biocore_application_components: AuthMolecule
- biocore_application_components: ContractEmailService
- biocore_application_components: Database
- biocore_application_components: CreateContractInput
- biocore_application_components: RentalContract
- biocore_application_components: ContractFilters
- biocore_application_components: ContractMolecule
- biocore_application_components: Database
- biocore_application_components: ContractEmailEventType
- biocore_application_components: DeliveryStatus
- biocore_application_components: DocumentStatus
- biocore_application_components: FormalizationStatus
- biocore_application_components: DocumentVersionKind
- biocore_application_components: DocumentStorageStatus
- biocore_application_components: VerificationResult
- biocore_application_components: CreateCaseInput
- biocore_application_components: UploadOriginalDocumentInput
- biocore_application_components: UploadSignedDocumentInput
- biocore_application_components: ContractSignatureCase
- biocore_application_components: ContractDocumentVersion
- biocore_application_components: UploadOriginalDocumentResult
- biocore_application_components: ContractRow
- biocore_application_components: RiderRow
- biocore_application_components: MotorcycleRow
- biocore_application_components: AdminRow
- biocore_application_components: DeliveryContextRow
- biocore_application_components: DeliveryAttemptRow
- biocore_application_components: ContractDeliveryAttempt
- biocore_application_components: SendContractInput
- biocore_application_components: SendContractResult
- biocore_application_components: StartReviewInput
- biocore_application_components: ManualVerificationInput
- biocore_application_components: ContractVerification
- biocore_application_components: ManualVerificationResult
- biocore_application_components: ApprovalInput
- biocore_application_components: ApprovalResult
- biocore_application_components: RejectionInput
- biocore_application_components: RejectionResult
- biocore_application_components: ReviewStartResult
- biocore_application_components: AdministrativeSignatureCase
- biocore_application_components: ContractDeliveryAttemptPage
- biocore_application_components: ReviewQueueItem
- biocore_application_components: ReviewQueuePage
- biocore_application_components: AdministrativeDocumentDownload
- biocore_application_components: ContractSignatureCursor
- biocore_application_components: ContractSignaturePageOptions
- biocore_application_components: ReviewInput
- biocore_application_components: ContractDecisionResult
- biocore_application_components: PublicLinkAccessResult
- biocore_application_components: PublicOriginalDownloadResult
- biocore_application_components: PublicSignedUploadResult
- biocore_application_components: ContractEmailQueueInput
- biocore_application_components: ContractEmailService
- biocore_application_components: ContractSignatureMoleculeOptions
- biocore_application_components: bufferStream
- biocore_application_components: ContractSignatureMolecule
- biocore_application_components: isDownloadableStorageStatus
- biocore_application_components: normalizeContractSignaturePageLimit
- biocore_application_components: encodeContractSignatureCursor
- biocore_application_components: decodeContractSignatureCursor
- biocore_application_components: normalizePublicLinkBaseUrl
- biocore_application_components: Database
- biocore_application_components: CreateCosignerInput
- biocore_application_components: UpdateCosignerInput
- biocore_application_components: Cosigner
- biocore_application_components: CosignerMolecule
- biocore_application_components: Database
- biocore_application_components: ErrandType
- biocore_application_components: generatePin
- biocore_application_components: CreateErrandInput
- biocore_application_components: QuoteErrandInput
- biocore_application_components: ErrandQuote
- biocore_application_components: Errand
- biocore_application_components: ErrandFilters
- biocore_application_components: ErrandMolecule
- biocore_application_components: declares
- biocore_application_components: IMolecule
- biocore_application_components: Role
- biocore_application_components: PaginatedResult
- biocore_application_components: JwtPayload
- biocore_application_components: Database
- biocore_application_components: NotificationRecipientRole
- biocore_application_components: NotificationPriority
- biocore_application_components: InAppNotification
- biocore_application_components: CreateNotificationInput
- biocore_application_components: NotificationRow
- biocore_application_components: InAppNotificationMolecule
- biocore_application_components: Database
- biocore_application_components: ErrandsByStatus
- biocore_application_components: MotorcyclesByStatus
- biocore_application_components: ContractsByStatus
- biocore_application_components: AdminErrandFilters
- biocore_application_components: AdminErrand
- biocore_application_components: MetricsMolecule
- biocore_application_components: to
- biocore_application_components: listAllRiders
- biocore_application_components: listMotorcyclesForSelection
- biocore_application_components: listRidersForSelection
- biocore_application_components: Database
- biocore_application_components: CreateMotorcycleInput
- biocore_application_components: UpdateMotorcycleInput
- biocore_application_components: Motorcycle
- biocore_application_components: MotorcycleFilters
- biocore_application_components: MotorcycleMolecule
- biocore_application_components: Database
- biocore_application_components: Notification
- biocore_application_components: NotificationMolecule
- biocore_application_components: Database
- biocore_application_components: CreatePaymentInput
- biocore_application_components: RentalPayment
- biocore_application_components: PaymentMolecule
- biocore_application_components: Database
- biocore_application_components: ErrandType
- biocore_application_components: CreatePricingRuleInput
- biocore_application_components: PricingRule
- biocore_application_components: PricingMolecule
- biocore_application_components: must
- biocore_application_components: Database
- biocore_application_components: CreateRiderInput
- biocore_application_components: Rider
- biocore_application_components: RiderMolecule
- biocore_application_components: Database
- biocore_application_components: CreateUserInput
- biocore_application_components: User
- biocore_application_components: UserMolecule
- biocore_application_components: createAuthRoutes
- biocore_application_components: NextFunction
- biocore_application_components: Request
- biocore_application_components: RequestHandler
- biocore_application_components: Response
- biocore_application_components: MultipartFileUpload
- biocore_application_components: AdministrativeRequest
- biocore_application_components: createContractSignatureAdminRoutes
- biocore_application_components: withCaseAuthorization
- biocore_application_components: parseAdministrativeMultipart
- biocore_application_components: serializeCase
- biocore_application_components: serializeVersion
- biocore_application_components: serializeAttempt
- biocore_application_components: serializeReviewQueueItem
- biocore_application_components: NextFunction
- biocore_application_components: Request
- biocore_application_components: Response
- biocore_application_components: ContractSignaturePublicRoutesOptions
- biocore_application_components: createContractSignaturePublicRoutes
- biocore_application_components: publicRequestGuard
- biocore_application_components: sendPublicUploadError
- biocore_application_components: sendPublicEndpointError
- biocore_application_components: sendPublicUnexpectedError
- biocore_application_components: createContractRoutes
- biocore_application_components: createCosignerRoutes
- biocore_application_components: createErrandRoutes
- biocore_application_components: createMetricsRoutes
- biocore_application_components: as
- biocore_application_components: createMotorcycleRoutes
- biocore_application_components: NextFunction
- biocore_application_components: Request
- biocore_application_components: Response
- biocore_application_components: createNotificationRoutes
- biocore_application_components: createPaymentRoutes
- biocore_application_components: createPricingRoutes
- biocore_application_components: createRiderRoutes
- biocore_application_components: createUserRoutes
- biocore_application_components: index
- biocore_application_components: NavigationItem
- biocore_application_components: NotificationDropdownProps
- biocore_application_components: NotificationListProps
- biocore_application_components: NotificationListItemProps
- biocore_application_components: NotificationModalProps
- biocore_application_components: NotificationToastProps
- biocore_application_components: index
- biocore_application_components: TableColumn
- biocore_application_components: TableProps
- biocore_application_components: index
- biocore_application_components: RiderRegistrationFormProps
- biocore_application_components: ButtonProps
- biocore_application_components: CaptionProps
- biocore_application_components: CardProps
- biocore_application_components: RouteLocation
- biocore_application_components: RoutePreview
- biocore_application_components: RouteValue
- biocore_application_components: InputProps
- biocore_application_components: RiderRouteActionsProps
- biocore_application_components: MapRef
- biocore_application_components: RouteLocation
- biocore_application_components: RouteValue
- biocore_application_components: RoutePreview
- biocore_application_components: RoutePickerMapboxProps
- biocore_application_components: PointKind
- biocore_application_components: GeocoderFeature
- biocore_application_components: ReverseGeocodingResponse
- biocore_application_components: AuthState
- biocore_application_components: AuthContextType
- biocore_application_components: RegisterData
- biocore_application_components: useAuth
- biocore_application_components: PeriodFilterType
- biocore_application_components: PeriodType
- biocore_application_components: MetricsData
- biocore_application_components: Contract
- biocore_application_components: Errand
- biocore_application_components: PeriodFilterType
- biocore_application_components: StatusCount
- biocore_application_components: MetricsData
- biocore_application_components: PeriodType
- biocore_application_components: Motorcycle
- biocore_application_components: UseNotificationsReturn
- biocore_application_components: PricingRule
- biocore_application_components: Rider
- biocore_application_components: TabConfig
- biocore_application_components: TableColumn
- biocore_application_components: RiderOption
- biocore_application_components: MotorcycleOption
- biocore_application_components: PeriodFilterType
- biocore_application_components: TableColumn
- biocore_application_components: PeriodType
- biocore_application_components: TableColumn
- biocore_application_components: Rider
- biocore_application_components: TableColumn
- biocore_application_components: FeatureCardProps
- biocore_application_components: DateRange
- biocore_application_components: RoutePreview
- biocore_application_components: RouteValue
- biocore_application_components: CreateErrandForm
- biocore_application_components: RequestOptions
- biocore_application_components: ApiError
- biocore_application_components: api

## Current index.toon

```toon
--- meta
Key | Value
project | bio-core-motofleet
generated | 2026-09-03
last_change | register-ui
new_entities | src/routes/auth.routes.ts#POST:/login,src/routes/contract-signature.admin.routes.ts#POST:/contracts/:contractId/signature-case,src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/review,src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/original,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/send,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/resend,src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/attempts,src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/audit,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/review/start,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/verify,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/approve,src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/reject,src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/versions/:versionId/download,src/routes/contract-signature.public.routes.ts#POST:/:token/signed,src/routes/contract-signature.public.routes.ts#GET:/:token/original,src/routes/contract-signature.public.routes.ts#GET:/:token,src/routes/contract.routes.ts#GET:/,src/routes/contract.routes.ts#POST:/,src/routes/contract.routes.ts#PATCH:/:id/cancel,src/routes/contract.routes.ts#PATCH:/:id/renew,src/routes/cosigner.routes.ts#GET:/:riderId/cosigners,src/routes/cosigner.routes.ts#POST:/:riderId/cosigners,src/routes/cosigner.routes.ts#PUT:/cosigners/:id,src/routes/errand.routes.ts#POST:/route-estimate,src/routes/errand.routes.ts#POST:/quote,src/routes/errand.routes.ts#POST:/,src/routes/errand.routes.ts#GET:/available,src/routes/errand.routes.ts#GET:/my,src/routes/errand.routes.ts#GET:/:id/route-preview,src/routes/errand.routes.ts#PATCH:/:id/accept,src/routes/errand.routes.ts#PATCH:/:id/pickup,src/routes/errand.routes.ts#PATCH:/:id/deliver,src/routes/errand.routes.ts#PATCH:/:id/cancel,src/routes/metrics.routes.ts#GET:/metrics,src/routes/metrics.routes.ts#GET:/errands,src/routes/metrics.routes.ts#GET:/riders,src/routes/metrics.routes.ts#GET:/riders-select,src/routes/metrics.routes.ts#GET:/motorcycles-select,src/routes/metrics.routes.ts#PATCH:/riders/:id/availability,src/routes/motorcycle.routes.ts#GET:/,src/routes/motorcycle.routes.ts#POST:/,src/routes/motorcycle.routes.ts#PUT:/:id,src/routes/motorcycle.routes.ts#PATCH:/:id/status,src/routes/notification.routes.ts#GET:/,src/routes/notification.routes.ts#GET:/unread-count,src/routes/notification.routes.ts#PATCH:/read-all,src/routes/notification.routes.ts#PATCH:/:id/read,src/routes/notification.routes.ts#DELETE:/:id,src/routes/payment.routes.ts#GET:/:contractId/payments,src/routes/payment.routes.ts#POST:/:contractId/payments,src/routes/pricing.routes.ts#GET:/,src/routes/pricing.routes.ts#POST:/,src/routes/pricing.routes.ts#PATCH:/:id/deactivate,src/routes/rider.routes.ts#POST:/register,src/routes/rider.routes.ts#PATCH:/me/availability,src/routes/user.routes.ts#POST:/register,MoleculeContainer,createApp,getCurrentUtcTimestamp,getCurrentUtcTimestampSqlite,toUtcIso,toUtcSqlite,normalizeDocumentFilename,toRadians,haversineDistance,hashPassword,verifyPassword,isValidPassword,LoginInput,loginSchema,emailSchema,phoneSchema,passwordSchema,futureDateSchema,latitudeSchema,longitudeSchema,CreateContractInput,createContractSchema,SignatureCaseParams,ContractSignatureCaseParams,DocumentVersionParams,PublicSignatureLinkParams,ManualVerificationInput,ApprovalInput,RejectionInput,ReviewQueueQuery,AuditPaginationQuery,uuidSchema,signatureCaseIdSchema,documentVersionIdSchema,signatureLinkTokenSchema,signatureCaseParamsSchema,contractSignatureCaseParamsSchema,documentVersionParamsSchema,publicSignatureLinkParamsSchema,reviewStartSchema,manualVerificationSchema,approvalSchema,rejectionSchema,reviewQueueQuerySchema,auditPaginationQuerySchema,signatureCaseDetailQuerySchema,CreateCosignerInput,createCosignerSchema,CreateErrandInput,RouteEstimateRequest,routeCoordinatesSchema,routeEstimateRequestSchema,quoteErrandRequestSchema,createErrandSchema,index,CreateMotorcycleInput,createMotorcycleSchema,CreatePaymentInput,createPaymentSchema,must,CreatePricingRuleInput,createPricingRuleSchema,RiderDocumentType,CreateRiderInput,riderDocumentTypes,documentTypeSchema,documentNumberSchema,createRiderSchema,CreateUserInput,createUserSchema,schemas,MotorcycleState,ContractState,ErrandState,isValidMotorcycleTransition,isValidContractTransition,isValidErrandTransition,getValidMotorcycleTransitions,getValidErrandTransitions,PricingInput,PricingResult,roundHalfUp,assertSafeInteger,calculateFare,DocumentStatus,FormalizationStatus,DeliveryAttention,DocumentVersionKind,DocumentStorageStatus,ContractSignatureActorType,VerificationResult,DeliveryStatus,OutboxStatus,ContractEmailEventType,ContractAuditEventType,AuditResult,PdfValidationCode,PdfValidationError,getValidDocumentTransitions,isValidDocumentTransition,getValidFormalizationTransitions,isValidFormalizationTransition,ContractSignatureStateConflictError,assertDocumentTransition,assertFormalizationTransition,DOCUMENT_STATUSES,FORMALIZATION_STATUSES,DELIVERY_ATTENTIONS,DOCUMENT_VERSION_KINDS,DOCUMENT_STORAGE_STATUSES,CONTRACT_SIGNATURE_ACTOR_TYPES,VERIFICATION_RESULTS,DELIVERY_STATUSES,OUTBOX_STATUSES,CONTRACT_EMAIL_EVENT_TYPES,CONTRACT_AUDIT_EVENT_TYPES,AUDIT_RESULTS,PDF_VALIDATION_CODES,RouteEstimateResponse,RoutingProviderName,RoutingProfile,Coordinates,RouteGeometry,RouteEstimate,RoutingProvider,to,DomainError,NotFoundError,ValidationError,BusinessRuleViolation,InvalidStateTransition,ForbiddenError,UnauthorizedError,ConflictError,Database,ApplicationStartupStep,ApplicationOptions,ApplicationRuntime,guarantees,createApplication,main,DownloadableStatus,BackupCapacityEstimate,BackupVersionEntry,BackupObjectEntry,BackupManifest,BackupRestoreIncident,RestoreActivationContext,RestoreOptions,RestoreReport,BackupCoordinatorOptions,VersionRow,RestoreVersionRow,VersionIssue,BackupInventory,BackupCoordinatorError,BackupIntegrityError,BackupCoordinator,isCapacityGuard,isDownloadableStatus,assertStorageKey,assertMetadataMatches,assertUniqueVersionReferences,assertUniqueObjects,toManifestVersion,toManifestObject,readVersionRows,readRestoreVersionRows,assertSameVersionSnapshot,fingerprintVersions,validateManifestVersion,duplicateRowsByKey,groupManifestEntries,copyStorageObject,copyReadableExclusive,copyFileExclusive,fileMetadata,writeClosedManifest,readClosedManifest,prepareEmptyDirectory,safeManifestPath,safeManifestObjectPath,restoreReason,normalizeBackupError,isRecord,defaultWriteWindow,assertBackupComponents,ContractAuditActor,RecordContractAuditEventInput,ContractAuditEvent,ContractAuditPage,ContractAuditServiceOptions,ContractAuditEventRow,AuditCursor,ContractAuditService,sanitizeAuditMetadata,sanitizeObject,sanitizeValue,normalizeErrorCode,sanitizeErrorMessage,parseMetadata,normalizeLimit,encodeCursor,decodeCursor,RepositoryCapacityStatus,CapacityGuard,RepositoryConfigurationError,RepositoryCapacityError,RepositoryCapacityMonitorOptions,RepositoryCapacityMonitor,ContractDocumentRepositoryConfiguration,parsePositiveInteger,parseThresholds,readContractDocumentRepositoryConfiguration,DEFAULT_CAPACITY_THRESHOLDS,ContractEmailProcessingError,ContractEmailServiceOptions,ContractEmailQueueRow,RenderedContractEmail,ContractEmailSendResult,ContractEmailPayload,ContractEmailService,html,are,isContractEmailEventType,asPayload,requiredText,optionalText,normalizeDynamicText,normalizeIdentifier,normalizeCiphertext,normalizeRecipient,normalizeHeader,normalizeBaseUrl,safeLink,escapeHtml,plainText,parsePort,ProcessingStatus,ContractEmailQueueDbRow,ClaimedEmail,ContractEmailWorkerOptions,ContractEmailDeliveryPort,ContractEmailWorker,toQueueInput,normalizePositiveMinutes,normalizePositiveInteger,readProcessingTimeoutMinutes,CONTRACT_EMAIL_MAX_ATTEMPTS,CONTRACT_EMAIL_RETRY_DELAY_MS,DEFAULT_PROCESSING_TIMEOUT_MINUTES,ContractExpirationOutbox,ContractSignatureSchedulerMetrics,ContractSignatureSchedulerJobsOptions,ContractSignatureSchedulerJobsDependencies,ExpiredAttemptRow,SignatureCaseRow,QueueAdminRow,ContractSignatureSchedulerJobs,SchedulerIntervals,readSchedulerIntervals,readInterval,readStorageRetentionPolicy,readNonNegativeInterval,readRetentionAction,RegisterContractSignatureJobsOptions,only,registerContractSignatureJobs,CONTRACT_EMAIL_WORKER_INTERVAL_MS,CONTRACT_SIGNATURE_EXPIRATION_INTERVAL_MS,DEFAULT_STORAGE_RECONCILIATION_INTERVAL_MS,DEFAULT_STORAGE_CAPACITY_INTERVAL_MS,DEFAULT_STORAGE_RETENTION_POLICY,createDatabase,runMigrations,getDatabase,closeDatabase,DownloadableStorageStatus,DocumentMetadata,TemporaryDocument,StoredDocument,StoredDocumentEntry,TemporaryDocumentEntry,RetentionDeletionRequest,DocumentStorage,DocumentStorageError,DocumentStorageLimitError,createStorageKey,createTemporaryKey,isSafeKey,isWithin,PrivateFilesystemStorageOptions,PrivateFilesystemDocumentStorage,MAX_CONTRACT_DOCUMENT_BYTES,S3ObjectClient,DocumentStorageProvider,ConfiguredDocumentStorage,DocumentStorageFactoryOptions,createConfiguredDocumentStorage,createConfiguredS3DocumentStorage,readProvider,StorageReconciliationReport,StorageRetentionPolicy,MigrationVersionResultStatus,MigrationVersionResult,DocumentStorageMigrationOptions,DocumentStorageMigrationReport,DocumentStorageMigration,isDownloadableStorageStatus,sameMetadata,withSqliteWritesPaused,emptyReconciliationReport,PinoLogger,PinoStream,PinoFactory,decoupled,ILogger,LoggerCore,loggerLevel,createLoggerCore,createPostShutdownLogger,LoggerRegistry,startLoggerLifecycle,shutdownLoggerLifecycle,flushAndCloseTransport,PinoLoggerAdapter,createLogger,MultipartUploadErrorCode,MultipartUploadError,MultipartFileUpload,parseSingleMultipartFile,parseMultipartBody,extractBoundary,parseHeaders,getParameter,invalidMultipart,PdfValidationInput,ValidatedPdf,PdfValidator,normalizePdfMimeType,hasPdfTrailer,MAX_PDF_BYTES,PDF_MIME_TYPE,RoutingFailureReason,MapboxRoutingError,MapboxRequest,MapboxDirectionsService,MapboxDirectionsServiceFactory,MapboxDirectionsResponse,MapboxRoutingProvider,S3Directory,S3ObjectInfo,S3ListedObject,S3CompatibleDocumentStorageOptions,S3CompatibleDocumentStorage,normalizePrefix,assertTemporaryKey,assertRetentionExpired,assertMetadata,readBounded,toReadable,isConflict,isNotFound,normalizeStorageError,S3ClientConfig,AwsS3CompatibleClientOptions,AwsS3CompatibleObjectClient,createAwsS3CompatibleObjectClientFromEnvironment,parseDate,SchedulerClock,SchedulerTimerHandle,SchedulerTimers,SchedulerOptions,ScheduledTask,Scheduler,isLogger,readClock,assertInterval,RetentionAction,StorageReconcilerOptions,MutableStorageReconciliationReport,StorageReconciler,assertPolicy,groupByKey,isExpired,GeneratedLinkToken,ResolvedContractLink,ContractLinkResolution,DeliveryAttemptRow,TokenServiceOptions,TokenService,applyPublicLinkSecurityHeaders,sendPublicLinkResolutionError,RateLimitResult,TokenIpRateLimiter,addCalendarDaysUtc,normalizeEncryptionKey,PublicLinkRateLimitStore,PublicLinkRateLimiterOptions,PublicLinkRateLimitDecision,RateLimitEntry,PublicLinkRateLimiter,MapRateLimitStore,LINK_TOKEN_BYTES,LINK_EXPIRY_DAYS,INVALID_LINK_RESPONSE,Request,authMiddleware,optionalAuthMiddleware,with,AppError,domainErrorToStatus,formatZodError,errorHandler,appendContractSignatureStatuses,that,roleGuard,ZodSchema,validate,AuthMolecule,RentalContract,ContractFilters,ContractMolecule,CreateCaseInput,UploadOriginalDocumentInput,UploadSignedDocumentInput,ContractSignatureCase,ContractDocumentVersion,UploadOriginalDocumentResult,ContractRow,RiderRow,MotorcycleRow,AdminRow,DeliveryContextRow,ContractDeliveryAttempt,SendContractInput,SendContractResult,StartReviewInput,ContractVerification,ManualVerificationResult,ApprovalResult,RejectionResult,ReviewStartResult,AdministrativeSignatureCase,ContractDeliveryAttemptPage,ReviewQueueItem,ReviewQueuePage,AdministrativeDocumentDownload,ContractSignatureCursor,ContractSignaturePageOptions,ReviewInput,ContractDecisionResult,PublicLinkAccessResult,PublicOriginalDownloadResult,PublicSignedUploadResult,ContractEmailQueueInput,ContractSignatureMoleculeOptions,bufferStream,ContractSignatureMolecule,normalizeContractSignaturePageLimit,encodeContractSignatureCursor,decodeContractSignatureCursor,normalizePublicLinkBaseUrl,UpdateCosignerInput,Cosigner,CosignerMolecule,ErrandType,generatePin,QuoteErrandInput,ErrandQuote,Errand,ErrandFilters,ErrandMolecule,declares,IMolecule,Role,PaginatedResult,JwtPayload,NotificationRecipientRole,NotificationPriority,InAppNotification,CreateNotificationInput,NotificationRow,InAppNotificationMolecule,ErrandsByStatus,MotorcyclesByStatus,ContractsByStatus,AdminErrandFilters,AdminErrand,MetricsMolecule,listAllRiders,listMotorcyclesForSelection,listRidersForSelection,UpdateMotorcycleInput,Motorcycle,MotorcycleFilters,MotorcycleMolecule,Notification,NotificationMolecule,RentalPayment,PaymentMolecule,PricingRule,PricingMolecule,Rider,RiderMolecule,User,UserMolecule,createAuthRoutes,NextFunction,RequestHandler,Response,AdministrativeRequest,createContractSignatureAdminRoutes,withCaseAuthorization,parseAdministrativeMultipart,serializeCase,serializeVersion,serializeAttempt,serializeReviewQueueItem,ContractSignaturePublicRoutesOptions,createContractSignaturePublicRoutes,publicRequestGuard,sendPublicUploadError,sendPublicEndpointError,sendPublicUnexpectedError,createContractRoutes,createCosignerRoutes,createErrandRoutes,createMetricsRoutes,as,createMotorcycleRoutes,createNotificationRoutes,createPaymentRoutes,createPricingRoutes,createRiderRoutes,createUserRoutes,NavigationItem,NotificationDropdownProps,NotificationListProps,NotificationListItemProps,NotificationModalProps,NotificationToastProps,TableColumn,TableProps,RiderRegistrationFormProps,ButtonProps,CaptionProps,CardProps,RouteLocation,RoutePreview,RouteValue,InputProps,RiderRouteActionsProps,MapRef,RoutePickerMapboxProps,PointKind,GeocoderFeature,ReverseGeocodingResponse,AuthState,AuthContextType,RegisterData,useAuth,PeriodFilterType,PeriodType,MetricsData,Contract,StatusCount,UseNotificationsReturn,TabConfig,RiderOption,MotorcycleOption,FeatureCardProps,DateRange,CreateErrandForm,RequestOptions,ApiError,api
files | biocore_application_components.toon,dependencies.toon,node_mounts.toon,node_routes.toon,react_components.toon,react_hooks.toon,relationships.toon

--- biocore_application_components
Name | Layer | Kind | File | Contract | Purpose
MoleculeContainer | Composition | interface | src/app.ts | - | -
createApp | Composition | function | src/app.ts | - | -
getCurrentUtcTimestamp | Atom | function | src/atoms/dateUtils.ts | - | -
getCurrentUtcTimestampSqlite | Atom | function | src/atoms/dateUtils.ts | - | -
toUtcIso | Atom | function | src/atoms/dateUtils.ts | - | -
toUtcSqlite | Atom | function | src/atoms/dateUtils.ts | - | -
normalizeDocumentFilename | Atom | function | src/atoms/documentFilename.ts | - | -
toRadians | Atom | function | src/atoms/haversine.ts | - | -
haversineDistance | Atom | function | src/atoms/haversine.ts | - | -
hashPassword | Atom | function | src/atoms/password.ts | - | -
verifyPassword | Atom | function | src/atoms/password.ts | - | -
isValidPassword | Atom | function | src/atoms/password.ts | - | -
LoginInput | Atom | type | src/atoms/schemas/auth.schemas.ts | - | -
loginSchema | Atom | const | src/atoms/schemas/auth.schemas.ts | - | -
emailSchema | Atom | const | src/atoms/schemas/base.schemas.ts | - | -
phoneSchema | Atom | const | src/atoms/schemas/base.schemas.ts | - | -
passwordSchema | Atom | const | src/atoms/schemas/base.schemas.ts | - | -
futureDateSchema | Atom | const | src/atoms/schemas/base.schemas.ts | - | -
latitudeSchema | Atom | const | src/atoms/schemas/base.schemas.ts | - | -
longitudeSchema | Atom | const | src/atoms/schemas/base.schemas.ts | - | -
CreateContractInput | Atom | type | src/atoms/schemas/contract.schemas.ts | - | -
createContractSchema | Atom | const | src/atoms/schemas/contract.schemas.ts | - | -
SignatureCaseParams | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
ContractSignatureCaseParams | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
DocumentVersionParams | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
PublicSignatureLinkParams | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
ManualVerificationInput | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
ApprovalInput | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
RejectionInput | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
ReviewQueueQuery | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
AuditPaginationQuery | Atom | type | src/atoms/schemas/contractSignature.schemas.ts | - | -
uuidSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
signatureCaseIdSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
documentVersionIdSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
signatureLinkTokenSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
signatureCaseParamsSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
contractSignatureCaseParamsSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
documentVersionParamsSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
publicSignatureLinkParamsSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
reviewStartSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
manualVerificationSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
approvalSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
rejectionSchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
reviewQueueQuerySchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
auditPaginationQuerySchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
signatureCaseDetailQuerySchema | Atom | const | src/atoms/schemas/contractSignature.schemas.ts | - | -
CreateCosignerInput | Atom | type | src/atoms/schemas/cosigner.schemas.ts | - | -
createCosignerSchema | Atom | const | src/atoms/schemas/cosigner.schemas.ts | - | -
CreateErrandInput | Atom | type | src/atoms/schemas/errand.schemas.ts | - | -
RouteEstimateRequest | Atom | type | src/atoms/schemas/errand.schemas.ts | - | -
routeCoordinatesSchema | Atom | const | src/atoms/schemas/errand.schemas.ts | - | -
routeEstimateRequestSchema | Atom | const | src/atoms/schemas/errand.schemas.ts | - | -
quoteErrandRequestSchema | Atom | const | src/atoms/schemas/errand.schemas.ts | - | -
createErrandSchema | Atom | const | src/atoms/schemas/errand.schemas.ts | - | -
index | Atom | module | src/atoms/schemas/index.ts | - | -
CreateMotorcycleInput | Atom | type | src/atoms/schemas/motorcycle.schemas.ts | - | -
createMotorcycleSchema | Atom | const | src/atoms/schemas/motorcycle.schemas.ts | - | -
CreatePaymentInput | Atom | type | src/atoms/schemas/payment.schemas.ts | - | -
createPaymentSchema | Atom | const | src/atoms/schemas/payment.schemas.ts | - | -
must | Atom | type | src/atoms/schemas/pricing.schemas.ts | - | -
CreatePricingRuleInput | Atom | type | src/atoms/schemas/pricing.schemas.ts | - | -
createPricingRuleSchema | Atom | const | src/atoms/schemas/pricing.schemas.ts | - | -
RiderDocumentType | Atom | type | src/atoms/schemas/rider.schemas.ts | - | -
must | Atom | type | src/atoms/schemas/rider.schemas.ts | - | -
CreateRiderInput | Atom | type | src/atoms/schemas/rider.schemas.ts | - | -
riderDocumentTypes | Atom | const | src/atoms/schemas/rider.schemas.ts | - | -
documentTypeSchema | Atom | const | src/atoms/schemas/rider.schemas.ts | - | -
documentNumberSchema | Atom | const | src/atoms/schemas/rider.schemas.ts | - | -
createRiderSchema | Atom | const | src/atoms/schemas/rider.schemas.ts | - | -
CreateUserInput | Atom | type | src/atoms/schemas/user.schemas.ts | - | -
createUserSchema | Atom | const | src/atoms/schemas/user.schemas.ts | - | -
schemas | Atom | module | src/atoms/schemas.ts | - | -
MotorcycleState | Atom | type | src/atoms/stateMachines.ts | - | -
ContractState | Atom | type | src/atoms/stateMachines.ts | - | -
ErrandState | Atom | type | src/atoms/stateMachines.ts | - | -
isValidMotorcycleTransition | Atom | function | src/atoms/stateMachines.ts | - | -
isValidContractTransition | Atom | function | src/atoms/stateMachines.ts | - | -
isValidErrandTransition | Atom | function | src/atoms/stateMachines.ts | - | -
getValidMotorcycleTransitions | Atom | function | src/atoms/stateMachines.ts | - | -
getValidErrandTransitions | Atom | function | src/atoms/stateMachines.ts | - | -
PricingInput | Atom | interface | src/atoms/tarifa.ts | - | -
PricingResult | Atom | interface | src/atoms/tarifa.ts | - | -
roundHalfUp | Atom | function | src/atoms/tarifa.ts | - | -
assertSafeInteger | Atom | function | src/atoms/tarifa.ts | - | -
calculateFare | Atom | function | src/atoms/tarifa.ts | - | -
DocumentStatus | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
FormalizationStatus | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DeliveryAttention | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DocumentVersionKind | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DocumentStorageStatus | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
ContractSignatureActorType | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
VerificationResult | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DeliveryStatus | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
OutboxStatus | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
ContractEmailEventType | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
ContractAuditEventType | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
AuditResult | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
PdfValidationCode | Domain | type | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
PdfValidationError | Domain | class | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
getValidDocumentTransitions | Domain | function | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
isValidDocumentTransition | Domain | function | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
getValidFormalizationTransitions | Domain | function | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
isValidFormalizationTransition | Domain | function | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
ContractSignatureStateConflictError | Domain | class | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
assertDocumentTransition | Domain | function | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
assertFormalizationTransition | Domain | function | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DOCUMENT_STATUSES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
FORMALIZATION_STATUSES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DELIVERY_ATTENTIONS | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DOCUMENT_VERSION_KINDS | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DOCUMENT_STORAGE_STATUSES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
CONTRACT_SIGNATURE_ACTOR_TYPES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
VERIFICATION_RESULTS | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
DELIVERY_STATUSES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
OUTBOX_STATUSES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
CONTRACT_EMAIL_EVENT_TYPES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
CONTRACT_AUDIT_EVENT_TYPES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
AUDIT_RESULTS | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
PDF_VALIDATION_CODES | Domain | const | src/domains/contractSignature.ts | extends ValidationError,extends ConflictError | -
RouteEstimateRequest | Domain | interface | src/domains/errands/route.dto.ts | - | -
RouteEstimateResponse | Domain | interface | src/domains/errands/route.dto.ts | - | -
RoutingProviderName | Domain | type | src/domains/errands/RoutingProvider.ts | - | -
RoutingProfile | Domain | type | src/domains/errands/RoutingProvider.ts | - | -
Coordinates | Domain | interface | src/domains/errands/RoutingProvider.ts | - | -
RouteGeometry | Domain | interface | src/domains/errands/RoutingProvider.ts | - | -
RouteEstimate | Domain | interface | src/domains/errands/RoutingProvider.ts | - | -
RoutingProvider | Domain | interface | src/domains/errands/RoutingProvider.ts | - | -
to | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
DomainError | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
NotFoundError | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
ValidationError | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
BusinessRuleViolation | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
InvalidStateTransition | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
ForbiddenError | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
UnauthorizedError | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
ConflictError | Domain | class | src/domains/errors.ts | extends Error,extends DomainError | -
Database | Composition | type | src/index.ts | - | -
MoleculeContainer | Composition | type | src/index.ts | - | -
ApplicationStartupStep | Composition | type | src/index.ts | - | -
ApplicationOptions | Composition | interface | src/index.ts | - | -
ApplicationRuntime | Composition | interface | src/index.ts | - | -
guarantees | Composition | function | src/index.ts | - | -
createApplication | Composition | function | src/index.ts | - | -
main | Composition | function | src/index.ts | - | -
DownloadableStatus | Infrastructure | type | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupCapacityEstimate | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupVersionEntry | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupObjectEntry | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupManifest | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupRestoreIncident | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
RestoreActivationContext | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
RestoreOptions | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
RestoreReport | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupCoordinatorOptions | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
VersionRow | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
RestoreVersionRow | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
VersionIssue | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupInventory | Infrastructure | interface | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupCoordinatorError | Infrastructure | class | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupIntegrityError | Infrastructure | class | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
BackupCoordinator | Infrastructure | class | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
isCapacityGuard | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
isDownloadableStatus | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
assertStorageKey | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
assertMetadataMatches | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
assertUniqueVersionReferences | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
assertUniqueObjects | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
toManifestVersion | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
toManifestObject | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
readVersionRows | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
readRestoreVersionRows | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
assertSameVersionSnapshot | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
fingerprintVersions | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
validateManifestVersion | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
duplicateRowsByKey | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
groupManifestEntries | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
copyStorageObject | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
copyReadableExclusive | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
copyFileExclusive | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
fileMetadata | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
writeClosedManifest | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
readClosedManifest | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
prepareEmptyDirectory | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
safeManifestPath | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
safeManifestObjectPath | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
restoreReason | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
normalizeBackupError | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
isRecord | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
defaultWriteWindow | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
assertBackupComponents | Infrastructure | function | src/infrastructure/BackupCoordinator.ts | extends Error,extends BackupCoordinatorError | -
Database | Infrastructure | type | src/infrastructure/ContractAuditService.ts | - | -
AuditResult | Infrastructure | type | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditEventType | Infrastructure | type | src/infrastructure/ContractAuditService.ts | - | -
ContractSignatureActorType | Infrastructure | type | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditActor | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
RecordContractAuditEventInput | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditEvent | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditPage | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditServiceOptions | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditEventRow | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
AuditCursor | Infrastructure | interface | src/infrastructure/ContractAuditService.ts | - | -
ContractAuditService | Infrastructure | class | src/infrastructure/ContractAuditService.ts | - | -
sanitizeAuditMetadata | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
sanitizeObject | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
sanitizeValue | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
normalizeErrorCode | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
sanitizeErrorMessage | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
parseMetadata | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
normalizeLimit | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
encodeCursor | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
decodeCursor | Infrastructure | function | src/infrastructure/ContractAuditService.ts | - | -
RepositoryCapacityStatus | Infrastructure | interface | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
CapacityGuard | Infrastructure | interface | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
RepositoryConfigurationError | Infrastructure | class | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
RepositoryCapacityError | Infrastructure | class | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
RepositoryCapacityMonitorOptions | Infrastructure | interface | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
RepositoryCapacityMonitor | Infrastructure | class | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
ContractDocumentRepositoryConfiguration | Infrastructure | interface | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
parsePositiveInteger | Infrastructure | function | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
parseThresholds | Infrastructure | function | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
readContractDocumentRepositoryConfiguration | Infrastructure | function | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
DEFAULT_CAPACITY_THRESHOLDS | Infrastructure | const | src/infrastructure/ContractDocumentRepository.ts | CapacityGuard,extends Error | -
Database | Infrastructure | type | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailEventType | Infrastructure | type | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailProcessingError | Infrastructure | class | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailServiceOptions | Infrastructure | interface | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailQueueRow | Infrastructure | interface | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
RenderedContractEmail | Infrastructure | interface | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailSendResult | Infrastructure | interface | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailPayload | Infrastructure | type | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
ContractEmailService | Infrastructure | class | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
html | Infrastructure | type | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
are | Infrastructure | type | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
isContractEmailEventType | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
asPayload | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
requiredText | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
optionalText | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
normalizeDynamicText | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
normalizeIdentifier | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
normalizeCiphertext | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
normalizeRecipient | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
normalizeHeader | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
normalizeBaseUrl | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
safeLink | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
escapeHtml | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
plainText | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
parsePort | Infrastructure | function | src/infrastructure/ContractEmailService.ts | ContractEmailServiceContract,extends Error,extends ContractEmailQueueInput | -
Database | Infrastructure | type | src/infrastructure/ContractEmailWorker.ts | - | -
ProcessingStatus | Infrastructure | type | src/infrastructure/ContractEmailWorker.ts | - | -
ContractEmailQueueDbRow | Infrastructure | interface | src/infrastructure/ContractEmailWorker.ts | - | -
ClaimedEmail | Infrastructure | interface | src/infrastructure/ContractEmailWorker.ts | - | -
ContractEmailWorkerOptions | Infrastructure | interface | src/infrastructure/ContractEmailWorker.ts | - | -
ContractEmailDeliveryPort | Infrastructure | interface | src/infrastructure/ContractEmailWorker.ts | - | -
ContractEmailWorker | Infrastructure | class | src/infrastructure/ContractEmailWorker.ts | - | -
toQueueInput | Infrastructure | function | src/infrastructure/ContractEmailWorker.ts | - | -
normalizePositiveMinutes | Infrastructure | function | src/infrastructure/ContractEmailWorker.ts | - | -
normalizePositiveInteger | Infrastructure | function | src/infrastructure/ContractEmailWorker.ts | - | -
readProcessingTimeoutMinutes | Infrastructure | function | src/infrastructure/ContractEmailWorker.ts | - | -
CONTRACT_EMAIL_MAX_ATTEMPTS | Infrastructure | const | src/infrastructure/ContractEmailWorker.ts | - | -
CONTRACT_EMAIL_RETRY_DELAY_MS | Infrastructure | const | src/infrastructure/ContractEmailWorker.ts | - | -
DEFAULT_PROCESSING_TIMEOUT_MINUTES | Infrastructure | const | src/infrastructure/ContractEmailWorker.ts | - | -
Database | Infrastructure | type | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
ContractExpirationOutbox | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
ContractSignatureSchedulerMetrics | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
ContractSignatureSchedulerJobsOptions | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
ContractSignatureSchedulerJobsDependencies | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
ExpiredAttemptRow | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
SignatureCaseRow | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
QueueAdminRow | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
ContractSignatureSchedulerJobs | Infrastructure | class | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
SchedulerIntervals | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
readSchedulerIntervals | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
readInterval | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
readStorageRetentionPolicy | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
readNonNegativeInterval | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
readRetentionAction | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
RegisterContractSignatureJobsOptions | Infrastructure | interface | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
only | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
registerContractSignatureJobs | Infrastructure | function | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
CONTRACT_EMAIL_WORKER_INTERVAL_MS | Infrastructure | const | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
CONTRACT_SIGNATURE_EXPIRATION_INTERVAL_MS | Infrastructure | const | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
DEFAULT_STORAGE_RECONCILIATION_INTERVAL_MS | Infrastructure | const | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
DEFAULT_STORAGE_CAPACITY_INTERVAL_MS | Infrastructure | const | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
DEFAULT_STORAGE_RETENTION_POLICY | Infrastructure | const | src/infrastructure/ContractSignatureScheduler.ts | extends ContractSignatureSchedulerJobsOptions,extends readonly | -
createDatabase | Infrastructure | function | src/infrastructure/database.ts | - | -
runMigrations | Infrastructure | function | src/infrastructure/database.ts | - | -
getDatabase | Infrastructure | function | src/infrastructure/database.ts | - | -
closeDatabase | Infrastructure | function | src/infrastructure/database.ts | - | -
DownloadableStorageStatus | Infrastructure | type | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
DocumentMetadata | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
TemporaryDocument | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
StoredDocument | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
StoredDocumentEntry | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
TemporaryDocumentEntry | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
RetentionDeletionRequest | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
DocumentStorage | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
DocumentStorageError | Infrastructure | class | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
DocumentStorageLimitError | Infrastructure | class | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
createStorageKey | Infrastructure | function | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
createTemporaryKey | Infrastructure | function | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
isSafeKey | Infrastructure | function | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
isWithin | Infrastructure | function | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
PrivateFilesystemStorageOptions | Infrastructure | interface | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
PrivateFilesystemDocumentStorage | Infrastructure | class | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
MAX_CONTRACT_DOCUMENT_BYTES | Infrastructure | const | src/infrastructure/DocumentStorage.ts | DocumentStorage,extends DocumentMetadata,extends StoredDocument,extends TemporaryDocument,extends Error,extends DocumentStorageError | -
S3ObjectClient | Infrastructure | type | src/infrastructure/DocumentStorageFactory.ts | - | -
DocumentStorageProvider | Infrastructure | type | src/infrastructure/DocumentStorageFactory.ts | - | -
ConfiguredDocumentStorage | Infrastructure | interface | src/infrastructure/DocumentStorageFactory.ts | - | -
DocumentStorageFactoryOptions | Infrastructure | interface | src/infrastructure/DocumentStorageFactory.ts | - | -
createConfiguredDocumentStorage | Infrastructure | function | src/infrastructure/DocumentStorageFactory.ts | - | -
createConfiguredS3DocumentStorage | Infrastructure | function | src/infrastructure/DocumentStorageFactory.ts | - | -
readProvider | Infrastructure | function | src/infrastructure/DocumentStorageFactory.ts | - | -
DocumentMetadata | Infrastructure | type | src/infrastructure/DocumentStorageMigration.ts | - | -
DocumentStorage | Infrastructure | type | src/infrastructure/DocumentStorageMigration.ts | - | -
DownloadableStorageStatus | Infrastructure | type | src/infrastructure/DocumentStorageMigration.ts | - | -
StorageReconciliationReport | Infrastructure | type | src/infrastructure/DocumentStorageMigration.ts | - | -
StorageRetentionPolicy | Infrastructure | type | src/infrastructure/DocumentStorageMigration.ts | - | -
VersionRow | Infrastructure | interface | src/infrastructure/DocumentStorageMigration.ts | - | -
MigrationVersionResultStatus | Infrastructure | type | src/infrastructure/DocumentStorageMigration.ts | - | -
MigrationVersionResult | Infrastructure | interface | src/infrastructure/DocumentStorageMigration.ts | - | -
DocumentStorageMigrationOptions | Infrastructure | interface | src/infrastructure/DocumentStorageMigration.ts | - | -
DocumentStorageMigrationReport | Infrastructure | interface | src/infrastructure/DocumentStorageMigration.ts | - | -
DocumentStorageMigration | Infrastructure | class | src/infrastructure/DocumentStorageMigration.ts | - | -
isDownloadableStorageStatus | Infrastructure | function | src/infrastructure/DocumentStorageMigration.ts | - | -
sameMetadata | Infrastructure | function | src/infrastructure/DocumentStorageMigration.ts | - | -
withSqliteWritesPaused | Infrastructure | function | src/infrastructure/DocumentStorageMigration.ts | - | -
emptyReconciliationReport | Infrastructure | function | src/infrastructure/DocumentStorageMigration.ts | - | -
PinoLogger | Infrastructure | type | src/infrastructure/logger.ts | ILogger | -
PinoStream | Infrastructure | type | src/infrastructure/logger.ts | ILogger | -
PinoFactory | Infrastructure | type | src/infrastructure/logger.ts | ILogger | -
decoupled | Infrastructure | interface | src/infrastructure/logger.ts | ILogger | -
ILogger | Infrastructure | interface | src/infrastructure/logger.ts | ILogger | -
LoggerCore | Infrastructure | interface | src/infrastructure/logger.ts | ILogger | -
loggerLevel | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
createLoggerCore | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
createPostShutdownLogger | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
LoggerRegistry | Infrastructure | class | src/infrastructure/logger.ts | ILogger | -
startLoggerLifecycle | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
shutdownLoggerLifecycle | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
flushAndCloseTransport | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
PinoLoggerAdapter | Infrastructure | class | src/infrastructure/logger.ts | ILogger | -
createLogger | Infrastructure | function | src/infrastructure/logger.ts | ILogger | -
MultipartUploadErrorCode | Infrastructure | type | src/infrastructure/multipartUpload.ts | extends Error | -
MultipartUploadError | Infrastructure | class | src/infrastructure/multipartUpload.ts | extends Error | -
MultipartFileUpload | Infrastructure | interface | src/infrastructure/multipartUpload.ts | extends Error | -
parseSingleMultipartFile | Infrastructure | function | src/infrastructure/multipartUpload.ts | extends Error | -
parseMultipartBody | Infrastructure | function | src/infrastructure/multipartUpload.ts | extends Error | -
extractBoundary | Infrastructure | function | src/infrastructure/multipartUpload.ts | extends Error | -
parseHeaders | Infrastructure | function | src/infrastructure/multipartUpload.ts | extends Error | -
getParameter | Infrastructure | function | src/infrastructure/multipartUpload.ts | extends Error | -
invalidMultipart | Infrastructure | function | src/infrastructure/multipartUpload.ts | extends Error | -
PdfValidationCode | Infrastructure | type | src/infrastructure/PdfValidator.ts | - | -
PdfValidationInput | Infrastructure | interface | src/infrastructure/PdfValidator.ts | - | -
ValidatedPdf | Infrastructure | interface | src/infrastructure/PdfValidator.ts | - | -
PdfValidator | Infrastructure | class | src/infrastructure/PdfValidator.ts | - | -
normalizePdfMimeType | Infrastructure | function | src/infrastructure/PdfValidator.ts | - | -
hasPdfTrailer | Infrastructure | function | src/infrastructure/PdfValidator.ts | - | -
MAX_PDF_BYTES | Infrastructure | const | src/infrastructure/PdfValidator.ts | - | -
PDF_MIME_TYPE | Infrastructure | const | src/infrastructure/PdfValidator.ts | - | -
RoutingFailureReason | Infrastructure | type | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
MapboxRoutingError | Infrastructure | class | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
MapboxRequest | Infrastructure | interface | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
MapboxDirectionsService | Infrastructure | interface | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
MapboxDirectionsServiceFactory | Infrastructure | type | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
MapboxDirectionsResponse | Infrastructure | interface | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
MapboxRoutingProvider | Infrastructure | class | src/infrastructure/routing/MapboxRoutingProvider.ts | RoutingProvider,extends Error | -
DocumentMetadata | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
DocumentStorage | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
DownloadableStorageStatus | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
RetentionDeletionRequest | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
StoredDocument | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
StoredDocumentEntry | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
TemporaryDocument | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
TemporaryDocumentEntry | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3Directory | Infrastructure | type | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3ObjectClient | Infrastructure | interface | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3ObjectInfo | Infrastructure | interface | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3ListedObject | Infrastructure | interface | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3CompatibleDocumentStorageOptions | Infrastructure | interface | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3CompatibleDocumentStorage | Infrastructure | class | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
normalizePrefix | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
createTemporaryKey | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
assertStorageKey | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
assertTemporaryKey | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
assertRetentionExpired | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
assertMetadata | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
sameMetadata | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
readBounded | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
toReadable | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
isConflict | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
isNotFound | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
normalizeStorageError | Infrastructure | function | src/infrastructure/S3CompatibleDocumentStorage.ts | DocumentStorage | -
S3ClientConfig | Infrastructure | type | src/infrastructure/S3ObjectClient.ts | S3ObjectClient | -
AwsS3CompatibleClientOptions | Infrastructure | interface | src/infrastructure/S3ObjectClient.ts | S3ObjectClient | -
AwsS3CompatibleObjectClient | Infrastructure | class | src/infrastructure/S3ObjectClient.ts | S3ObjectClient | -
createAwsS3CompatibleObjectClientFromEnvironment | Infrastructure | function | src/infrastructure/S3ObjectClient.ts | S3ObjectClient | -
parseDate | Infrastructure | function | src/infrastructure/S3ObjectClient.ts | S3ObjectClient | -
isNotFound | Infrastructure | function | src/infrastructure/S3ObjectClient.ts | S3ObjectClient | -
SchedulerClock | Infrastructure | type | src/infrastructure/scheduler.ts | - | -
SchedulerTimerHandle | Infrastructure | type | src/infrastructure/scheduler.ts | - | -
SchedulerTimers | Infrastructure | interface | src/infrastructure/scheduler.ts | - | -
SchedulerOptions | Infrastructure | interface | src/infrastructure/scheduler.ts | - | -
ScheduledTask | Infrastructure | interface | src/infrastructure/scheduler.ts | - | -
Scheduler | Infrastructure | class | src/infrastructure/scheduler.ts | - | -
isLogger | Infrastructure | function | src/infrastructure/scheduler.ts | - | -
readClock | Infrastructure | function | src/infrastructure/scheduler.ts | - | -
assertInterval | Infrastructure | function | src/infrastructure/scheduler.ts | - | -
Database | Infrastructure | type | src/infrastructure/StorageReconciler.ts | - | -
RetentionAction | Infrastructure | type | src/infrastructure/StorageReconciler.ts | - | -
StorageRetentionPolicy | Infrastructure | interface | src/infrastructure/StorageReconciler.ts | - | -
StorageReconcilerOptions | Infrastructure | interface | src/infrastructure/StorageReconciler.ts | - | -
StorageReconciliationReport | Infrastructure | interface | src/infrastructure/StorageReconciler.ts | - | -
VersionRow | Infrastructure | interface | src/infrastructure/StorageReconciler.ts | - | -
MutableStorageReconciliationReport | Infrastructure | interface | src/infrastructure/StorageReconciler.ts | - | -
StorageReconciler | Infrastructure | class | src/infrastructure/StorageReconciler.ts | - | -
assertPolicy | Infrastructure | function | src/infrastructure/StorageReconciler.ts | - | -
groupByKey | Infrastructure | function | src/infrastructure/StorageReconciler.ts | - | -
parseDate | Infrastructure | function | src/infrastructure/StorageReconciler.ts | - | -
isExpired | Infrastructure | function | src/infrastructure/StorageReconciler.ts | - | -
Database | Infrastructure | type | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
GeneratedLinkToken | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
ResolvedContractLink | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
ContractLinkResolution | Infrastructure | type | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
DeliveryAttemptRow | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
TokenServiceOptions | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
TokenService | Infrastructure | class | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
applyPublicLinkSecurityHeaders | Infrastructure | function | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
sendPublicLinkResolutionError | Infrastructure | function | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
RateLimitResult | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
TokenIpRateLimiter | Infrastructure | class | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
addCalendarDaysUtc | Infrastructure | function | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
normalizeEncryptionKey | Infrastructure | function | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
PublicLinkRateLimitStore | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
PublicLinkRateLimiterOptions | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
PublicLinkRateLimitDecision | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
RateLimitEntry | Infrastructure | interface | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
PublicLinkRateLimiter | Infrastructure | class | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
MapRateLimitStore | Infrastructure | class | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
LINK_TOKEN_BYTES | Infrastructure | const | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
LINK_EXPIRY_DAYS | Infrastructure | const | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
INVALID_LINK_RESPONSE | Infrastructure | const | src/infrastructure/TokenService.ts | PublicLinkRateLimitStore | -
Request | Middleware | interface | src/middleware/auth.middleware.ts | - | -
authMiddleware | Middleware | function | src/middleware/auth.middleware.ts | - | -
optionalAuthMiddleware | Middleware | function | src/middleware/auth.middleware.ts | - | -
with | Middleware | class | src/middleware/errorHandler.middleware.ts | extends Error | -
AppError | Middleware | class | src/middleware/errorHandler.middleware.ts | extends Error | -
domainErrorToStatus | Middleware | function | src/middleware/errorHandler.middleware.ts | extends Error | -
formatZodError | Middleware | function | src/middleware/errorHandler.middleware.ts | extends Error | -
errorHandler | Middleware | function | src/middleware/errorHandler.middleware.ts | extends Error | -
appendContractSignatureStatuses | Middleware | function | src/middleware/errorHandler.middleware.ts | extends Error | -
that | Middleware | function | src/middleware/roleGuard.middleware.ts | - | -
roleGuard | Middleware | function | src/middleware/roleGuard.middleware.ts | - | -
ZodSchema | Middleware | type | src/middleware/validate.middleware.ts | - | -
that | Middleware | function | src/middleware/validate.middleware.ts | - | -
validate | Middleware | function | src/middleware/validate.middleware.ts | - | -
formatZodError | Middleware | function | src/middleware/validate.middleware.ts | - | -
AuthMolecule | Molecule | class | src/molecules/AuthMolecule.ts | IMolecule | -
ContractEmailService | Molecule | module | src/molecules/ContractEmailService.ts | - | -
Database | Molecule | type | src/molecules/ContractMolecule.ts | IMolecule | -
CreateContractInput | Molecule | interface | src/molecules/ContractMolecule.ts | IMolecule | -
RentalContract | Molecule | interface | src/molecules/ContractMolecule.ts | IMolecule | -
ContractFilters | Molecule | interface | src/molecules/ContractMolecule.ts | IMolecule | -
ContractMolecule | Molecule | class | src/molecules/ContractMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractEmailEventType | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
DeliveryStatus | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
DocumentStatus | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
FormalizationStatus | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
DocumentVersionKind | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
DocumentStorageStatus | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
VerificationResult | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
CreateCaseInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
UploadOriginalDocumentInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
UploadSignedDocumentInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractSignatureCase | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractDocumentVersion | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
UploadOriginalDocumentResult | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractRow | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
RiderRow | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
MotorcycleRow | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
AdminRow | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
DeliveryContextRow | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
DeliveryAttemptRow | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractDeliveryAttempt | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
SendContractInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
SendContractResult | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
StartReviewInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ManualVerificationInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractVerification | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ManualVerificationResult | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ApprovalInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ApprovalResult | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
RejectionInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
RejectionResult | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ReviewStartResult | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
AdministrativeSignatureCase | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractDeliveryAttemptPage | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ReviewQueueItem | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ReviewQueuePage | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
AdministrativeDocumentDownload | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractSignatureCursor | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractSignaturePageOptions | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ReviewInput | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractDecisionResult | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
PublicLinkAccessResult | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
PublicOriginalDownloadResult | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
PublicSignedUploadResult | Molecule | type | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractEmailQueueInput | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractEmailService | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractSignatureMoleculeOptions | Molecule | interface | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
bufferStream | Molecule | function | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
ContractSignatureMolecule | Molecule | class | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
isDownloadableStorageStatus | Molecule | function | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
normalizeContractSignaturePageLimit | Molecule | function | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
encodeContractSignatureCursor | Molecule | function | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
decodeContractSignatureCursor | Molecule | function | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
normalizePublicLinkBaseUrl | Molecule | function | src/molecules/ContractSignatureMolecule.ts | IMolecule,extends ContractDeliveryAttempt,extends ContractSignatureCase | -
Database | Molecule | type | src/molecules/CosignerMolecule.ts | IMolecule | -
CreateCosignerInput | Molecule | interface | src/molecules/CosignerMolecule.ts | IMolecule | -
UpdateCosignerInput | Molecule | interface | src/molecules/CosignerMolecule.ts | IMolecule | -
Cosigner | Molecule | interface | src/molecules/CosignerMolecule.ts | IMolecule | -
CosignerMolecule | Molecule | class | src/molecules/CosignerMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/ErrandMolecule.ts | IMolecule | -
ErrandType | Molecule | type | src/molecules/ErrandMolecule.ts | IMolecule | -
generatePin | Molecule | function | src/molecules/ErrandMolecule.ts | IMolecule | -
CreateErrandInput | Molecule | interface | src/molecules/ErrandMolecule.ts | IMolecule | -
QuoteErrandInput | Molecule | interface | src/molecules/ErrandMolecule.ts | IMolecule | -
ErrandQuote | Molecule | type | src/molecules/ErrandMolecule.ts | IMolecule | -
Errand | Molecule | interface | src/molecules/ErrandMolecule.ts | IMolecule | -
ErrandFilters | Molecule | interface | src/molecules/ErrandMolecule.ts | IMolecule | -
ErrandMolecule | Molecule | class | src/molecules/ErrandMolecule.ts | IMolecule | -
declares | Molecule | class | src/molecules/IMolecule.ts | IMolecule | -
IMolecule | Molecule | interface | src/molecules/IMolecule.ts | IMolecule | -
Role | Molecule | type | src/molecules/IMolecule.ts | IMolecule | -
PaginatedResult | Molecule | interface | src/molecules/IMolecule.ts | IMolecule | -
JwtPayload | Molecule | interface | src/molecules/IMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
NotificationRecipientRole | Molecule | type | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
NotificationPriority | Molecule | type | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
InAppNotification | Molecule | interface | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
CreateNotificationInput | Molecule | interface | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
NotificationRow | Molecule | type | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
InAppNotificationMolecule | Molecule | class | src/molecules/InAppNotificationMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/MetricsMolecule.ts | IMolecule | -
ErrandsByStatus | Molecule | interface | src/molecules/MetricsMolecule.ts | IMolecule | -
MotorcyclesByStatus | Molecule | interface | src/molecules/MetricsMolecule.ts | IMolecule | -
ContractsByStatus | Molecule | interface | src/molecules/MetricsMolecule.ts | IMolecule | -
AdminErrandFilters | Molecule | interface | src/molecules/MetricsMolecule.ts | IMolecule | -
AdminErrand | Molecule | interface | src/molecules/MetricsMolecule.ts | IMolecule | -
MetricsMolecule | Molecule | class | src/molecules/MetricsMolecule.ts | IMolecule | -
to | Molecule | function | src/molecules/MetricsMolecule.ts | IMolecule | -
listAllRiders | Molecule | function | src/molecules/MetricsMolecule.ts | IMolecule | -
listMotorcyclesForSelection | Molecule | function | src/molecules/MetricsMolecule.ts | IMolecule | -
listRidersForSelection | Molecule | function | src/molecules/MetricsMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/MotorcycleMolecule.ts | IMolecule | -
CreateMotorcycleInput | Molecule | interface | src/molecules/MotorcycleMolecule.ts | IMolecule | -
UpdateMotorcycleInput | Molecule | interface | src/molecules/MotorcycleMolecule.ts | IMolecule | -
Motorcycle | Molecule | interface | src/molecules/MotorcycleMolecule.ts | IMolecule | -
MotorcycleFilters | Molecule | interface | src/molecules/MotorcycleMolecule.ts | IMolecule | -
MotorcycleMolecule | Molecule | class | src/molecules/MotorcycleMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/NotificationMolecule.ts | IMolecule | -
Notification | Molecule | interface | src/molecules/NotificationMolecule.ts | IMolecule | -
NotificationMolecule | Molecule | class | src/molecules/NotificationMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/PaymentMolecule.ts | IMolecule | -
CreatePaymentInput | Molecule | interface | src/molecules/PaymentMolecule.ts | IMolecule | -
RentalPayment | Molecule | interface | src/molecules/PaymentMolecule.ts | IMolecule | -
PaymentMolecule | Molecule | class | src/molecules/PaymentMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/PricingMolecule.ts | IMolecule | -
ErrandType | Molecule | type | src/molecules/PricingMolecule.ts | IMolecule | -
CreatePricingRuleInput | Molecule | interface | src/molecules/PricingMolecule.ts | IMolecule | -
PricingRule | Molecule | interface | src/molecules/PricingMolecule.ts | IMolecule | -
PricingMolecule | Molecule | class | src/molecules/PricingMolecule.ts | IMolecule | -
must | Molecule | type | src/molecules/PricingMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/RiderMolecule.ts | IMolecule | -
CreateRiderInput | Molecule | interface | src/molecules/RiderMolecule.ts | IMolecule | -
Rider | Molecule | interface | src/molecules/RiderMolecule.ts | IMolecule | -
RiderMolecule | Molecule | class | src/molecules/RiderMolecule.ts | IMolecule | -
Database | Molecule | type | src/molecules/UserMolecule.ts | IMolecule | -
CreateUserInput | Molecule | interface | src/molecules/UserMolecule.ts | IMolecule | -
User | Molecule | interface | src/molecules/UserMolecule.ts | IMolecule | -
UserMolecule | Molecule | class | src/molecules/UserMolecule.ts | IMolecule | -
createAuthRoutes | Route | function | src/routes/auth.routes.ts | - | -
NextFunction | Route | type | src/routes/contract-signature.admin.routes.ts | extends Request | -
Request | Route | type | src/routes/contract-signature.admin.routes.ts | extends Request | -
RequestHandler | Route | type | src/routes/contract-signature.admin.routes.ts | extends Request | -
Response | Route | type | src/routes/contract-signature.admin.routes.ts | extends Request | -
MultipartFileUpload | Route | type | src/routes/contract-signature.admin.routes.ts | extends Request | -
AdministrativeRequest | Route | interface | src/routes/contract-signature.admin.routes.ts | extends Request | -
createContractSignatureAdminRoutes | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
withCaseAuthorization | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
parseAdministrativeMultipart | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
serializeCase | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
serializeVersion | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
serializeAttempt | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
serializeReviewQueueItem | Route | function | src/routes/contract-signature.admin.routes.ts | extends Request | -
NextFunction | Route | type | src/routes/contract-signature.public.routes.ts | - | -
Request | Route | type | src/routes/contract-signature.public.routes.ts | - | -
Response | Route | type | src/routes/contract-signature.public.routes.ts | - | -
ContractSignaturePublicRoutesOptions | Route | interface | src/routes/contract-signature.public.routes.ts | - | -
createContractSignaturePublicRoutes | Route | function | src/routes/contract-signature.public.routes.ts | - | -
publicRequestGuard | Route | function | src/routes/contract-signature.public.routes.ts | - | -
sendPublicUploadError | Route | function | src/routes/contract-signature.public.routes.ts | - | -
sendPublicEndpointError | Route | function | src/routes/contract-signature.public.routes.ts | - | -
sendPublicUnexpectedError | Route | function | src/routes/contract-signature.public.routes.ts | - | -
createContractRoutes | Route | function | src/routes/contract.routes.ts | - | -
createCosignerRoutes | Route | function | src/routes/cosigner.routes.ts | - | -
createErrandRoutes | Route | function | src/routes/errand.routes.ts | - | -
createMetricsRoutes | Route | function | src/routes/metrics.routes.ts | - | -
as | Route | type | src/routes/metrics.routes.ts | - | -
createMotorcycleRoutes | Route | function | src/routes/motorcycle.routes.ts | - | -
NextFunction | Route | type | src/routes/notification.routes.ts | - | -
Request | Route | type | src/routes/notification.routes.ts | - | -
Response | Route | type | src/routes/notification.routes.ts | - | -
createNotificationRoutes | Route | function | src/routes/notification.routes.ts | - | -
createPaymentRoutes | Route | function | src/routes/payment.routes.ts | - | -
createPricingRoutes | Route | function | src/routes/pricing.routes.ts | - | -
createRiderRoutes | Route | function | src/routes/rider.routes.ts | - | -
createUserRoutes | Route | function | src/routes/user.routes.ts | - | -
Footer | FrontendComponent | const | frontend/src/components/layout/Footer.tsx | - | Provides site-wide navigation and business information.
ImageContentHome | FrontendComponent | const | frontend/src/components/layout/ImageContentHome.tsx | - | Promotes the service with branded home-page imagery.
index | FrontendComponent | module | frontend/src/components/layout/index.ts | - | -
NavigationItem | FrontendComponent | interface | frontend/src/components/layout/MobileBottomNav.tsx | - | -
MobileBottomNav | FrontendComponent | const | frontend/src/components/layout/MobileBottomNav.tsx | - | Enables mobile users to navigate core app areas.
TopNav | FrontendComponent | const | frontend/src/components/layout/TopNav.tsx | - | Provides authenticated navigation and account controls.
NotificationBell | FrontendComponent | const | frontend/src/components/notifications/NotificationBell.tsx | - | Signals unread operational updates to users.
NotificationDropdownProps | FrontendComponent | interface | frontend/src/components/notifications/NotificationDropdown.tsx | - | -
NotificationDropdown | FrontendComponent | const | frontend/src/components/notifications/NotificationDropdown.tsx | - | Displays recent notifications for quick user action.
NotificationListProps | FrontendComponent | interface | frontend/src/components/notifications/NotificationList.tsx | - | -
NotificationList | FrontendComponent | const | frontend/src/components/notifications/NotificationList.tsx | - | Organizes notifications for review and management.
NotificationListItemProps | FrontendComponent | interface | frontend/src/components/notifications/NotificationListItem.tsx | - | -
NotificationListItem | FrontendComponent | const | frontend/src/components/notifications/NotificationListItem.tsx | - | Presents notification details and available actions.
NotificationModalProps | FrontendComponent | interface | frontend/src/components/notifications/NotificationModal.tsx | - | -
NotificationModal | FrontendComponent | const | frontend/src/components/notifications/NotificationModal.tsx | - | Provides focused notification review and interaction.
NotificationToastProps | FrontendComponent | interface | frontend/src/components/notifications/NotificationToast.tsx | - | -
NotificationToast | FrontendComponent | const | frontend/src/components/notifications/NotificationToast.tsx | - | Alerts users to timely events with quick inbox access.
index | FrontendComponent | module | frontend/src/components/shared/components/index.ts | - | -
TableColumn | FrontendComponent | interface | frontend/src/components/shared/components/Table/index.tsx | - | -
TableProps | FrontendComponent | interface | frontend/src/components/shared/components/Table/index.tsx | - | -
Table | FrontendComponent | const | frontend/src/components/shared/components/Table/index.tsx | - | Presents business records in a consistent, scannable format.
index | FrontendComponent | module | frontend/src/components/shared/index.ts | - | -
RiderRegistrationFormProps | FrontendComponent | interface | frontend/src/components/shared/RiderRegistrationForm.tsx | - | -
RiderRegistrationForm | FrontendComponent | const | frontend/src/components/shared/RiderRegistrationForm.tsx | - | Captures rider details to initiate onboarding.
ButtonProps | FrontendComponent | interface | frontend/src/components/ui/Button.tsx | extends React | -
Button | FrontendComponent | const | frontend/src/components/ui/Button.tsx | extends React | Provides consistent action controls across business workflows.
CaptionProps | FrontendComponent | interface | frontend/src/components/ui/Caption.tsx | - | -
Caption | FrontendComponent | const | frontend/src/components/ui/Caption.tsx | - | Displays supporting text that clarifies business content.
CardProps | FrontendComponent | interface | frontend/src/components/ui/Card.tsx | - | -
Card | FrontendComponent | const | frontend/src/components/ui/Card.tsx | - | Groups related business content into a clear visual unit.
RouteLocation | FrontendComponent | type | frontend/src/components/ui/index.ts | - | -
RoutePreview | FrontendComponent | type | frontend/src/components/ui/index.ts | - | -
RouteValue | FrontendComponent | type | frontend/src/components/ui/index.ts | - | -
InputProps | FrontendComponent | interface | frontend/src/components/ui/Input.tsx | extends React | -
Input | FrontendComponent | const | frontend/src/components/ui/Input.tsx | extends React | Captures validated user data for business workflows.
RiderRouteActionsProps | FrontendComponent | interface | frontend/src/components/ui/RiderRouteActions.tsx | - | -
RiderRouteActions | FrontendComponent | const | frontend/src/components/ui/RiderRouteActions.tsx | - | Supports rider route decisions and errand progression.
MapRef | FrontendComponent | type | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
RouteLocation | FrontendComponent | interface | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
RouteValue | FrontendComponent | interface | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
RoutePreview | FrontendComponent | type | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
RoutePickerMapboxProps | FrontendComponent | interface | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
PointKind | FrontendComponent | type | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
GeocoderFeature | FrontendComponent | type | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
ReverseGeocodingResponse | FrontendComponent | type | frontend/src/components/ui/RoutePickerMapbox.tsx | - | -
RoutePickerMapbox | FrontendComponent | const | frontend/src/components/ui/RoutePickerMapbox.tsx | - | Helps users select and preview delivery routes.
AuthState | FrontendContext | interface | frontend/src/context/AuthContext.tsx | extends AuthState | -
AuthContextType | FrontendContext | interface | frontend/src/context/AuthContext.tsx | extends AuthState | -
RegisterData | FrontendContext | interface | frontend/src/context/AuthContext.tsx | extends AuthState | -
AuthProvider | FrontendContext | const | frontend/src/context/AuthContext.tsx | extends AuthState | Manages user identity and access across the application.
useAuth | FrontendContext | const | frontend/src/context/AuthContext.tsx | extends AuthState | -
PeriodFilterType | FrontendHook | type | frontend/src/hooks/index.ts | - | -
PeriodType | FrontendHook | type | frontend/src/hooks/index.ts | - | -
MetricsData | FrontendHook | type | frontend/src/hooks/index.ts | - | -
Contract | FrontendHook | interface | frontend/src/hooks/useContracts.ts | - | -
useContracts | FrontendHook | const | frontend/src/hooks/useContracts.ts | - | Retrieves and refreshes contract data for administrators.
useDarkMode | FrontendHook | function | frontend/src/hooks/useDarkMode.ts | - | Controls display theme preferences across the application.
Errand | FrontendHook | interface | frontend/src/hooks/useErrands.ts | - | -
PeriodFilterType | FrontendHook | type | frontend/src/hooks/useErrands.ts | - | -
useAvailableErrands | FrontendHook | const | frontend/src/hooks/useErrands.ts | - | Retrieves errands available for rider assignment.
useMyErrands | FrontendHook | const | frontend/src/hooks/useErrands.ts | - | Retrieves a user's errands for status tracking.
useAdminErrands | FrontendHook | const | frontend/src/hooks/useErrands.ts | - | Retrieves errand data for administrative oversight.
useErrandActions | FrontendHook | const | frontend/src/hooks/useErrands.ts | - | Coordinates errand actions across fulfillment workflows.
StatusCount | FrontendHook | interface | frontend/src/hooks/useMetrics.ts | - | -
MetricsData | FrontendHook | interface | frontend/src/hooks/useMetrics.ts | - | -
PeriodType | FrontendHook | type | frontend/src/hooks/useMetrics.ts | - | -
useMetrics | FrontendHook | const | frontend/src/hooks/useMetrics.ts | - | Retrieves business metrics and reporting date ranges.
Motorcycle | FrontendHook | interface | frontend/src/hooks/useMotorcycles.ts | - | -
useMotorcycles | FrontendHook | const | frontend/src/hooks/useMotorcycles.ts | - | Retrieves and refreshes fleet motorcycle records.
UseNotificationsReturn | FrontendHook | interface | frontend/src/hooks/useNotifications.ts | - | -
useNotifications | FrontendHook | const | frontend/src/hooks/useNotifications.ts | - | Retrieves notifications and manages their read status.
PricingRule | FrontendHook | interface | frontend/src/hooks/usePricingRules.ts | - | -
usePricingRules | FrontendHook | const | frontend/src/hooks/usePricingRules.ts | - | Retrieves pricing rules for quote management.
Rider | FrontendHook | interface | frontend/src/hooks/useRiders.ts | - | -
useRiders | FrontendHook | const | frontend/src/hooks/useRiders.ts | - | Retrieves and refreshes rider records for operations.
TabConfig | FrontendPage | interface | frontend/src/pages/admin/AdminWorkspace.tsx | - | -
AdminWorkspace | FrontendPage | const | frontend/src/pages/admin/AdminWorkspace.tsx | - | Centralizes administrative operations and oversight.
CreateCosigner | FrontendPage | const | frontend/src/pages/admin/consigners/CreateCosigner.tsx | - | Records cosigner details for rider contract support.
TableColumn | FrontendPage | type | frontend/src/pages/admin/contracts/Contracts.tsx | - | -
Contracts | FrontendPage | const | frontend/src/pages/admin/contracts/Contracts.tsx | - | Enables administrators to monitor rider contracts.
RiderOption | FrontendPage | interface | frontend/src/pages/admin/contracts/CreateContract.tsx | - | -
MotorcycleOption | FrontendPage | interface | frontend/src/pages/admin/contracts/CreateContract.tsx | - | -
CreateContract | FrontendPage | const | frontend/src/pages/admin/contracts/CreateContract.tsx | - | Creates rider contracts with required business terms.
CreatePayment | FrontendPage | const | frontend/src/pages/admin/CreatePayment.tsx | - | Records contract payments for financial tracking.
PeriodFilterType | FrontendPage | type | frontend/src/pages/admin/errands/AdminErrands.tsx | - | -
TableColumn | FrontendPage | type | frontend/src/pages/admin/errands/AdminErrands.tsx | - | -
AdminErrands | FrontendPage | const | frontend/src/pages/admin/errands/AdminErrands.tsx | - | Helps administrators oversee errand operations.
PeriodType | FrontendPage | type | frontend/src/pages/admin/metrics/Metrics.tsx | - | -
Metrics | FrontendPage | const | frontend/src/pages/admin/metrics/Metrics.tsx | - | Displays operational metrics for business decision-making.
CreateMotorcycle | FrontendPage | const | frontend/src/pages/admin/motorcycles/CreateMotorcycle.tsx | - | Registers motorcycles for fleet management.
TableColumn | FrontendPage | type | frontend/src/pages/admin/motorcycles/Motorcycles.tsx | - | -
Motorcycles | FrontendPage | const | frontend/src/pages/admin/motorcycles/Motorcycles.tsx | - | Enables administrators to manage the motorcycle fleet.
CreateRider | FrontendPage | const | frontend/src/pages/admin/riders/CreateRider.tsx | - | Registers riders for operational assignment.
Rider | FrontendPage | type | frontend/src/pages/admin/riders/Riders.tsx | - | -
TableColumn | FrontendPage | type | frontend/src/pages/admin/riders/Riders.tsx | - | -
Riders | FrontendPage | const | frontend/src/pages/admin/riders/Riders.tsx | - | Supports administration of rider records and availability.
CreatePricingRule | FrontendPage | const | frontend/src/pages/admin/rules/CreatePricingRule.tsx | - | Defines pricing rules for consistent errand quotes.
PricingRules | FrontendPage | const | frontend/src/pages/admin/rules/PricingRules.tsx | - | Enables administrators to manage active pricing rules.
Login | FrontendPage | const | frontend/src/pages/auth/Login.tsx | - | Authenticates users before granting application access.
Register | FrontendPage | const | frontend/src/pages/auth/Register.tsx | - | Creates customer accounts for service access.
RegisterRider | FrontendPage | const | frontend/src/pages/auth/RegisterRider.tsx | - | Starts rider onboarding and account creation.
Dashboard | FrontendPage | const | frontend/src/pages/Dashboard.tsx | - | Gives users a role-based summary of key activities.
FeatureCardProps | FrontendPage | interface | frontend/src/pages/Home.tsx | - | -
Home | FrontendPage | const | frontend/src/pages/Home.tsx | - | Introduces the service and directs users to core actions.
AvailableErrands | FrontendPage | const | frontend/src/pages/rider/AvailableErrands.tsx | - | Helps riders discover and accept available errands.
DateRange | FrontendPage | type | frontend/src/pages/rider/RiderErrands.tsx | - | -
RiderErrands | FrontendPage | const | frontend/src/pages/rider/RiderErrands.tsx | - | Lets riders track and manage their assigned errands.
RiderHome | FrontendPage | const | frontend/src/pages/rider/RiderHome.tsx | - | Summarizes rider workload and current errand activity.
RoutePreview | FrontendPage | type | frontend/src/pages/user/CreateErrand.tsx | - | -
RouteValue | FrontendPage | type | frontend/src/pages/user/CreateErrand.tsx | - | -
CreateErrandForm | FrontendPage | type | frontend/src/pages/user/CreateErrand.tsx | - | -
CreateErrand | FrontendPage | const | frontend/src/pages/user/CreateErrand.tsx | - | Captures delivery requests for pricing and fulfillment.
UserMyErrands | FrontendPage | const | frontend/src/pages/user/MyErrands.tsx | - | Lets customers track and manage their errand requests.
RequestOptions | FrontendService | interface | frontend/src/services/api.ts | extends Error | -
ApiError | FrontendService | class | frontend/src/services/api.ts | extends Error | -
api | FrontendService | const | frontend/src/services/api.ts | extends Error | -

--- dependencies
Name | Version | Type
@fontsource/poppins | ^5.3.0 | prod
@mapbox/search-js-react | 1.6.0 | prod
mapbox-gl | 3.28.1 | prod
react | ^18.3.1 | prod
react-dom | ^18.3.1 | prod
react-map-gl | 8.1.2 | prod
react-router-dom | ^6.28.0 | prod
@vitejs/plugin-react | ^4.3.4 | dev
autoprefixer | ^10.4.20 | dev
postcss | ^8.4.49 | dev
tailwindcss | ^3.4.15 | dev
typescript | ^5.7.3 | dev
vite | ^5.4.11 | dev
@aws-sdk/client-s3 | 3.750.0 | prod
@mapbox/mapbox-sdk | 0.16.2 | prod
bcrypt | 5.1.1 | prod
better-sqlite3 | 11.7.0 | prod
express | 4.21.2 | prod
jsonwebtoken | 9.0.2 | prod
nodemailer | 6.9.16 | prod
pdf-lib | 1.17.1 | prod
pino | 9.6.0 | prod
pino-pretty | 13.0.0 | prod
uuid | 11.1.0 | prod
zod | 3.24.2 | prod
fast-check | 3.23.2 | dev
supertest | 7.0.0 | dev
tsx | 4.19.2 | dev

--- node_mounts
Name | Mount | Router | Middleware | File
src/app.ts#/api/auth:createAuthRoutes | /api/auth | createAuthRoutes | - | src/app.ts
src/app.ts#/api/users:createUserRoutes | /api/users | createUserRoutes | - | src/app.ts
src/app.ts#/api/riders:createRiderRoutes | /api/riders | createRiderRoutes | - | src/app.ts
src/app.ts#/public/contract-signatures:createContractSignaturePublicRoutes | /public/contract-signatures | createContractSignaturePublicRoutes | - | src/app.ts
src/app.ts#/api:createContractSignatureAdminRoutes | /api | createContractSignatureAdminRoutes | - | src/app.ts
src/app.ts#/api/motorcycles:createMotorcycleRoutes | /api/motorcycles | createMotorcycleRoutes | - | src/app.ts
src/app.ts#/api/contracts:createContractRoutes | /api/contracts | createContractRoutes | - | src/app.ts
src/app.ts#/api/pricing-rules:createPricingRoutes | /api/pricing-rules | createPricingRoutes | - | src/app.ts
src/app.ts#/api/admin:createMetricsRoutes | /api/admin | createMetricsRoutes | - | src/app.ts
src/app.ts#/api/riders:createCosignerRoutes | /api/riders | createCosignerRoutes | - | src/app.ts
src/app.ts#/api/contracts:createPaymentRoutes | /api/contracts | createPaymentRoutes | - | src/app.ts
src/app.ts#/api/errands:createErrandRoutes | /api/errands | createErrandRoutes | - | src/app.ts
src/app.ts#/api/notifications:createNotificationRoutes | /api/notifications | createNotificationRoutes | - | src/app.ts
src/app.ts#/:errorHandler | / | - | errorHandler | src/app.ts
src/routes/contract-signature.admin.routes.ts#/contracts/:contractId/signature-case:authMiddleware,roleGuard | /contracts/:contractId/signature-case | - | authMiddleware,roleGuard | src/routes/contract-signature.admin.routes.ts
src/routes/contract-signature.admin.routes.ts#/contract-signatures:authMiddleware,roleGuard | /contract-signatures | - | authMiddleware,roleGuard | src/routes/contract-signature.admin.routes.ts
src/routes/contract-signature.public.routes.ts#/:optionalAuthMiddleware | / | - | optionalAuthMiddleware | src/routes/contract-signature.public.routes.ts
src/routes/contract.routes.ts#/:authMiddleware,roleGuard | / | - | authMiddleware,roleGuard | src/routes/contract.routes.ts
src/routes/cosigner.routes.ts#/:authMiddleware,roleGuard | / | - | authMiddleware,roleGuard | src/routes/cosigner.routes.ts
src/routes/errand.routes.ts#/:authMiddleware | / | - | authMiddleware | src/routes/errand.routes.ts
src/routes/metrics.routes.ts#/:authMiddleware,roleGuard | / | - | authMiddleware,roleGuard | src/routes/metrics.routes.ts
src/routes/motorcycle.routes.ts#/:authMiddleware,roleGuard | / | - | authMiddleware,roleGuard | src/routes/motorcycle.routes.ts
src/routes/notification.routes.ts#/:authMiddleware | / | - | authMiddleware | src/routes/notification.routes.ts
src/routes/payment.routes.ts#/:authMiddleware,roleGuard | / | - | authMiddleware,roleGuard | src/routes/payment.routes.ts
src/routes/pricing.routes.ts#/:authMiddleware,roleGuard | / | - | authMiddleware,roleGuard | src/routes/pricing.routes.ts

--- node_routes
RouteId | Method | Path | Handler | File | Purpose
src/routes/auth.routes.ts#POST:/login | POST | /login | - | src/routes/auth.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contracts/:contractId/signature-case | POST | /contracts/:contractId/signature-case | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/review | GET | /contract-signatures/review | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId | GET | /contract-signatures/:caseId | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/original | POST | /contract-signatures/:caseId/original | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/send | POST | /contract-signatures/:caseId/send | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/resend | POST | /contract-signatures/:caseId/resend | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/attempts | GET | /contract-signatures/:caseId/attempts | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/audit | GET | /contract-signatures/:caseId/audit | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/review/start | POST | /contract-signatures/:caseId/review/start | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/verify | POST | /contract-signatures/:caseId/verify | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/approve | POST | /contract-signatures/:caseId/approve | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#POST:/contract-signatures/:caseId/reject | POST | /contract-signatures/:caseId/reject | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.admin.routes.ts#GET:/contract-signatures/:caseId/versions/:versionId/download | GET | /contract-signatures/:caseId/versions/:versionId/download | - | src/routes/contract-signature.admin.routes.ts | -
src/routes/contract-signature.public.routes.ts#POST:/:token/signed | POST | /:token/signed | - | src/routes/contract-signature.public.routes.ts | -
src/routes/contract-signature.public.routes.ts#GET:/:token/original | GET | /:token/original | - | src/routes/contract-signature.public.routes.ts | -
src/routes/contract-signature.public.routes.ts#GET:/:token | GET | /:token | - | src/routes/contract-signature.public.routes.ts | -
src/routes/contract.routes.ts#GET:/ | GET | / | - | src/routes/contract.routes.ts | -
src/routes/contract.routes.ts#POST:/ | POST | / | - | src/routes/contract.routes.ts | -
src/routes/contract.routes.ts#PATCH:/:id/cancel | PATCH | /:id/cancel | - | src/routes/contract.routes.ts | -
src/routes/contract.routes.ts#PATCH:/:id/renew | PATCH | /:id/renew | - | src/routes/contract.routes.ts | -
src/routes/cosigner.routes.ts#GET:/:riderId/cosigners | GET | /:riderId/cosigners | - | src/routes/cosigner.routes.ts | -
src/routes/cosigner.routes.ts#POST:/:riderId/cosigners | POST | /:riderId/cosigners | - | src/routes/cosigner.routes.ts | -
src/routes/cosigner.routes.ts#PUT:/cosigners/:id | PUT | /cosigners/:id | - | src/routes/cosigner.routes.ts | -
src/routes/errand.routes.ts#POST:/route-estimate | POST | /route-estimate | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#POST:/quote | POST | /quote | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#POST:/ | POST | / | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#GET:/available | GET | /available | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#GET:/my | GET | /my | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#GET:/:id/route-preview | GET | /:id/route-preview | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#PATCH:/:id/accept | PATCH | /:id/accept | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#PATCH:/:id/pickup | PATCH | /:id/pickup | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#PATCH:/:id/deliver | PATCH | /:id/deliver | - | src/routes/errand.routes.ts | -
src/routes/errand.routes.ts#PATCH:/:id/cancel | PATCH | /:id/cancel | - | src/routes/errand.routes.ts | -
src/routes/metrics.routes.ts#GET:/metrics | GET | /metrics | - | src/routes/metrics.routes.ts | -
src/routes/metrics.routes.ts#GET:/errands | GET | /errands | - | src/routes/metrics.routes.ts | -
src/routes/metrics.routes.ts#GET:/riders | GET | /riders | - | src/routes/metrics.routes.ts | -
src/routes/metrics.routes.ts#GET:/riders-select | GET | /riders-select | - | src/routes/metrics.routes.ts | -
src/routes/metrics.routes.ts#GET:/motorcycles-select | GET | /motorcycles-select | - | src/routes/metrics.routes.ts | -
src/routes/metrics.routes.ts#PATCH:/riders/:id/availability | PATCH | /riders/:id/availability | - | src/routes/metrics.routes.ts | -
src/routes/motorcycle.routes.ts#GET:/ | GET | / | - | src/routes/motorcycle.routes.ts | -
src/routes/motorcycle.routes.ts#POST:/ | POST | / | - | src/routes/motorcycle.routes.ts | -
src/routes/motorcycle.routes.ts#PUT:/:id | PUT | /:id | - | src/routes/motorcycle.routes.ts | -
src/routes/motorcycle.routes.ts#PATCH:/:id/status | PATCH | /:id/status | - | src/routes/motorcycle.routes.ts | -
src/routes/notification.routes.ts#GET:/ | GET | / | - | src/routes/notification.routes.ts | -
src/routes/notification.routes.ts#GET:/unread-count | GET | /unread-count | - | src/routes/notification.routes.ts | -
src/routes/notification.routes.ts#PATCH:/read-all | PATCH | /read-all | - | src/routes/notification.routes.ts | -
src/routes/notification.routes.ts#PATCH:/:id/read | PATCH | /:id/read | - | src/routes/notification.routes.ts | -
src/routes/notification.routes.ts#DELETE:/:id | DELETE | /:id | - | src/routes/notification.routes.ts | -
src/routes/payment.routes.ts#GET:/:contractId/payments | GET | /:contractId/payments | - | src/routes/payment.routes.ts | -
src/routes/payment.routes.ts#POST:/:contractId/payments | POST | /:contractId/payments | - | src/routes/payment.routes.ts | -
src/routes/pricing.routes.ts#GET:/ | GET | / | - | src/routes/pricing.routes.ts | -
src/routes/pricing.routes.ts#POST:/ | POST | / | - | src/routes/pricing.routes.ts | -
src/routes/pricing.routes.ts#PATCH:/:id/deactivate | PATCH | /:id/deactivate | - | src/routes/pricing.routes.ts | -
src/routes/rider.routes.ts#POST:/register | POST | /register | - | src/routes/rider.routes.ts | -
src/routes/rider.routes.ts#PATCH:/me/availability | PATCH | /me/availability | - | src/routes/rider.routes.ts | -
src/routes/user.routes.ts#POST:/register | POST | /register | - | src/routes/user.routes.ts | -

--- react_components
Name | File | Purpose | Props | Consumes
Footer | frontend/src/components/layout/Footer.tsx | Provides site-wide navigation and business information. | - | -
ImageContentHome | frontend/src/components/layout/ImageContentHome.tsx | Promotes the service with branded home-page imagery. | - | -
MobileBottomNav | frontend/src/components/layout/MobileBottomNav.tsx | Enables mobile users to navigate core app areas. | isActive | useAuth
TopNav | frontend/src/components/layout/TopNav.tsx | Provides authenticated navigation and account controls. | - | useAuth,useDarkMode
NotificationBell | frontend/src/components/notifications/NotificationBell.tsx | Signals unread operational updates to users. | - | useNotifications
NotificationDropdown | frontend/src/components/notifications/NotificationDropdown.tsx | Displays recent notifications for quick user action. | unreadCount,notifications,isLoading,hasError,onClose | -
NotificationList | frontend/src/components/notifications/NotificationList.tsx | Organizes notifications for review and management. | notifications,isLoading,hasError,onMarkAsRead,onDelete | -
NotificationListItem | frontend/src/components/notifications/NotificationListItem.tsx | Presents notification details and available actions. | notification,onMarkAsRead,onDelete | -
NotificationModal | frontend/src/components/notifications/NotificationModal.tsx | Provides focused notification review and interaction. | - | -
NotificationToast | frontend/src/components/notifications/NotificationToast.tsx | Alerts users to timely events with quick inbox access. | notification,onClose,onOpenInbox | -
Table | frontend/src/components/shared/components/Table/index.tsx | Presents business records in a consistent, scannable format. | - | -
RiderRegistrationForm | frontend/src/components/shared/RiderRegistrationForm.tsx | Captures rider details to initiate onboarding. | title,submitLabel,onSuccess | -
Button | frontend/src/components/ui/Button.tsx | Provides consistent action controls across business workflows. | variant = "primary",children,className = "",...props | -
Caption | frontend/src/components/ui/Caption.tsx | Displays supporting text that clarifies business content. | children,className = "" | -
Card | frontend/src/components/ui/Card.tsx | Groups related business content into a clear visual unit. | children,variant = "base",className = "" | -
Input | frontend/src/components/ui/Input.tsx | Captures validated user data for business workflows. | label,className = "",id,...props | -
RiderRouteActions | frontend/src/components/ui/RiderRouteActions.tsx | Supports rider route decisions and errand progression. | errand,navigationTarget,mobileMapFirst = false,autoLoadOnMobile = false | useEffect,useState,useErrandActions
RoutePickerMapbox | frontend/src/components/ui/RoutePickerMapbox.tsx | Helps users select and preview delivery routes. | value,onChange,routePreview = null | useRef,useState
AuthProvider | frontend/src/context/AuthContext.tsx | Manages user identity and access across the application. | children | -
AdminWorkspace | frontend/src/pages/admin/AdminWorkspace.tsx | Centralizes administrative operations and oversight. | - | useSearchParams
CreateCosigner | frontend/src/pages/admin/consigners/CreateCosigner.tsx | Records cosigner details for rider contract support. | name,address,phone,relationship,identity_document | useNavigate,useAuth
Contracts | frontend/src/pages/admin/contracts/Contracts.tsx | Enables administrators to monitor rider contracts. | - | useContracts
CreateContract | frontend/src/pages/admin/contracts/CreateContract.tsx | Creates rider contracts with required business terms. | ...prev,[field] | useNavigate,useAuth
CreatePayment | frontend/src/pages/admin/CreatePayment.tsx | Records contract payments for financial tracking. | amount,payment_date,payment_method,period,notes | useNavigate,useAuth
AdminErrands | frontend/src/pages/admin/errands/AdminErrands.tsx | Helps administrators oversee errand operations. | - | useAdminErrands
Metrics | frontend/src/pages/admin/metrics/Metrics.tsx | Displays operational metrics for business decision-making. | - | useMetrics
CreateMotorcycle | frontend/src/pages/admin/motorcycles/CreateMotorcycle.tsx | Registers motorcycles for fleet management. | ...prev,[field] | useNavigate,useAuth
Motorcycles | frontend/src/pages/admin/motorcycles/Motorcycles.tsx | Enables administrators to manage the motorcycle fleet. | - | useMotorcycles
CreateRider | frontend/src/pages/admin/riders/CreateRider.tsx | Registers riders for operational assignment. | - | useNavigate
Riders | frontend/src/pages/admin/riders/Riders.tsx | Supports administration of rider records and availability. | - | useRiders,useAuth
CreatePricingRule | frontend/src/pages/admin/rules/CreatePricingRule.tsx | Defines pricing rules for consistent errand quotes. | errand_type,base_rate,rate_per_km,commission_percentage | useNavigate,useAuth
PricingRules | frontend/src/pages/admin/rules/PricingRules.tsx | Enables administrators to manage active pricing rules. | - | usePricingRules
Login | frontend/src/pages/auth/Login.tsx | Authenticates users before granting application access. | - | useNavigate,useAuth
Register | frontend/src/pages/auth/Register.tsx | Creates customer accounts for service access. | name,email,phone,address,password | useNavigate,useAuth
RegisterRider | frontend/src/pages/auth/RegisterRider.tsx | Starts rider onboarding and account creation. | - | useNavigate
Dashboard | frontend/src/pages/Dashboard.tsx | Gives users a role-based summary of key activities. | title,href | useAuth
Home | frontend/src/pages/Home.tsx | Introduces the service and directs users to core actions. | title,description | -
AvailableErrands | frontend/src/pages/rider/AvailableErrands.tsx | Helps riders discover and accept available errands. | - | useAvailableErrands,useErrandActions
RiderErrands | frontend/src/pages/rider/RiderErrands.tsx | Lets riders track and manage their assigned errands. | - | useMyErrands,useErrandActions
RiderHome | frontend/src/pages/rider/RiderHome.tsx | Summarizes rider workload and current errand activity. | - | useMyErrands
CreateErrand | frontend/src/pages/user/CreateErrand.tsx | Captures delivery requests for pricing and fulfillment. | origin,destination | useNavigate,useErrandActions
UserMyErrands | frontend/src/pages/user/MyErrands.tsx | Lets customers track and manage their errand requests. | - | useMyErrands,useErrandActions

--- react_hooks
Name | File | Purpose | Returns
useContracts | frontend/src/hooks/useContracts.ts | Retrieves and refreshes contract data for administrators. | { contracts, loading, error, refresh }
useDarkMode | frontend/src/hooks/useDarkMode.ts | Controls display theme preferences across the application. | { isDark, toggle }
useAvailableErrands | frontend/src/hooks/useErrands.ts | Retrieves errands available for rider assignment. | { errands, loading, error, refresh }
useMyErrands | frontend/src/hooks/useErrands.ts | Retrieves a user's errands for status tracking. | { errands, loading, error, refresh }
useAdminErrands | frontend/src/hooks/useErrands.ts | Retrieves errand data for administrative oversight. | { errands, loading, error, refresh }
useErrandActions | frontend/src/hooks/useErrands.ts | Coordinates errand actions across fulfillment workflows. | { errands, loading, error, refresh }
useMetrics | frontend/src/hooks/useMetrics.ts | Retrieves business metrics and reporting date ranges. | { metrics, loading, error, refresh, getDateRange }
useMotorcycles | frontend/src/hooks/useMotorcycles.ts | Retrieves and refreshes fleet motorcycle records. | { motorcycles, loading, error, refresh }
useNotifications | frontend/src/hooks/useNotifications.ts | Retrieves notifications and manages their read status. | UseNotificationsReturn
usePricingRules | frontend/src/hooks/usePricingRules.ts | Retrieves pricing rules for quote management. | { rules, loading, error, refresh }
useRiders | frontend/src/hooks/useRiders.ts | Retrieves and refreshes rider records for operations. | { riders, loading, error, refresh }

--- relationships
From | To | Relation | File
app | auth.routes | imports | src/app.ts
app | user.routes | imports | src/app.ts
app | rider.routes | imports | src/app.ts
app | motorcycle.routes | imports | src/app.ts
app | contract.routes | imports | src/app.ts
app | cosigner.routes | imports | src/app.ts
app | payment.routes | imports | src/app.ts
app | pricing.routes | imports | src/app.ts
app | errand.routes | imports | src/app.ts
app | notification.routes | imports | src/app.ts
app | metrics.routes | imports | src/app.ts
app | contract-signature.public.routes | imports | src/app.ts
app | contract-signature.admin.routes | imports | src/app.ts
app | errorHandler.middleware | imports | src/app.ts
auth.schemas | base.schemas | imports | src/atoms/schemas/auth.schemas.ts
contractSignature.schemas | contractSignature | imports | src/atoms/schemas/contractSignature.schemas.ts
errand.schemas | base.schemas | imports | src/atoms/schemas/errand.schemas.ts
motorcycle.schemas | base.schemas | imports | src/atoms/schemas/motorcycle.schemas.ts
rider.schemas | base.schemas | imports | src/atoms/schemas/rider.schemas.ts
user.schemas | base.schemas | imports | src/atoms/schemas/user.schemas.ts
schemas | user.schemas | imports | src/atoms/schemas.ts
contractSignature | errors | imports | src/domains/contractSignature.ts
index | App | imports | src/index.ts
index | database | imports | src/index.ts
index | logger | imports | src/index.ts
index | scheduler | imports | src/index.ts
index | AuthMolecule | imports | src/index.ts
index | UserMolecule | imports | src/index.ts
index | RiderMolecule | imports | src/index.ts
index | MotorcycleMolecule | imports | src/index.ts
index | ContractMolecule | imports | src/index.ts
index | CosignerMolecule | imports | src/index.ts
index | PaymentMolecule | imports | src/index.ts
index | PricingMolecule | imports | src/index.ts
index | ErrandMolecule | imports | src/index.ts
index | NotificationMolecule | imports | src/index.ts
index | InAppNotificationMolecule | imports | src/index.ts
index | MetricsMolecule | imports | src/index.ts
index | MapboxRoutingProvider | injects | src/index.ts
index | DocumentStorageFactory | imports | src/index.ts
index | ContractSignatureMolecule | imports | src/index.ts
index | PdfValidator | imports | src/index.ts
index | TokenService | injects | src/index.ts
index | ContractAuditService | injects | src/index.ts
index | ContractEmailService | injects | src/index.ts
index | ContractEmailWorker | imports | src/index.ts
index | StorageReconciler | imports | src/index.ts
index | ContractSignatureScheduler | imports | src/index.ts
BackupCoordinator | ContractAuditService | injects | src/infrastructure/BackupCoordinator.ts
ContractAuditService | contractSignature | imports | src/infrastructure/ContractAuditService.ts
ContractAuditService | errors | imports | src/infrastructure/ContractAuditService.ts
ContractDocumentRepository | DocumentStorage | imports | src/infrastructure/ContractDocumentRepository.ts
ContractEmailService | contractSignature | imports | src/infrastructure/ContractEmailService.ts
ContractEmailWorker | ContractAuditService | injects | src/infrastructure/ContractEmailWorker.ts
ContractEmailWorker | logger | imports | src/infrastructure/ContractEmailWorker.ts
database | logger | imports | src/infrastructure/database.ts
DocumentStorageFactory | ContractDocumentRepository | imports | src/infrastructure/DocumentStorageFactory.ts
DocumentStorageFactory | DocumentStorage | imports | src/infrastructure/DocumentStorageFactory.ts
DocumentStorageFactory | S3CompatibleDocumentStorage | imports | src/infrastructure/DocumentStorageFactory.ts
DocumentStorageFactory | S3ObjectClient | imports | src/infrastructure/DocumentStorageFactory.ts
DocumentStorageMigration | ContractAuditService | injects | src/infrastructure/DocumentStorageMigration.ts
DocumentStorageMigration | DocumentStorage | imports | src/infrastructure/DocumentStorageMigration.ts
DocumentStorageMigration | S3CompatibleDocumentStorage | imports | src/infrastructure/DocumentStorageMigration.ts
DocumentStorageMigration | StorageReconciler | imports | src/infrastructure/DocumentStorageMigration.ts
multipartUpload | documentFilename | imports | src/infrastructure/multipartUpload.ts
PdfValidator | contractSignature | imports | src/infrastructure/PdfValidator.ts
S3CompatibleDocumentStorage | DocumentStorage | imports | src/infrastructure/S3CompatibleDocumentStorage.ts
S3ObjectClient | DocumentStorage | imports | src/infrastructure/S3ObjectClient.ts
scheduler | logger | imports | src/infrastructure/scheduler.ts
StorageReconciler | ContractAuditService | injects | src/infrastructure/StorageReconciler.ts
auth.middleware | logger | imports | src/middleware/auth.middleware.ts
errorHandler.middleware | logger | imports | src/middleware/errorHandler.middleware.ts
errorHandler.middleware | multipartUpload | imports | src/middleware/errorHandler.middleware.ts
errorHandler.middleware | ContractDocumentRepository | imports | src/middleware/errorHandler.middleware.ts
errorHandler.middleware | errors | imports | src/middleware/errorHandler.middleware.ts
AuthMolecule | password | imports | src/molecules/AuthMolecule.ts
AuthMolecule | logger | imports | src/molecules/AuthMolecule.ts
AuthMolecule | IMolecule | imports | src/molecules/AuthMolecule.ts
ContractMolecule | stateMachines | imports | src/molecules/ContractMolecule.ts
ContractMolecule | dateUtils | imports | src/molecules/ContractMolecule.ts
ContractMolecule | errors | imports | src/molecules/ContractMolecule.ts
ContractSignatureMolecule | DocumentStorage | imports | src/molecules/ContractSignatureMolecule.ts
ContractSignatureMolecule | contractSignature | imports | src/molecules/ContractSignatureMolecule.ts
ContractSignatureMolecule | errors | imports | src/molecules/ContractSignatureMolecule.ts
ContractSignatureMolecule | dateUtils | imports | src/molecules/ContractSignatureMolecule.ts
ContractSignatureMolecule | documentFilename | imports | src/molecules/ContractSignatureMolecule.ts
ContractSignatureMolecule | ContractDocumentRepository | imports | src/molecules/ContractSignatureMolecule.ts
CosignerMolecule | errors | imports | src/molecules/CosignerMolecule.ts
ErrandMolecule | stateMachines | imports | src/molecules/ErrandMolecule.ts
ErrandMolecule | tarifa | imports | src/molecules/ErrandMolecule.ts
ErrandMolecule | dateUtils | imports | src/molecules/ErrandMolecule.ts
ErrandMolecule | errors | imports | src/molecules/ErrandMolecule.ts
MotorcycleMolecule | stateMachines | imports | src/molecules/MotorcycleMolecule.ts
MotorcycleMolecule | dateUtils | imports | src/molecules/MotorcycleMolecule.ts
MotorcycleMolecule | errors | imports | src/molecules/MotorcycleMolecule.ts
NotificationMolecule | dateUtils | imports | src/molecules/NotificationMolecule.ts
PaymentMolecule | dateUtils | imports | src/molecules/PaymentMolecule.ts
PaymentMolecule | errors | imports | src/molecules/PaymentMolecule.ts
PricingMolecule | dateUtils | imports | src/molecules/PricingMolecule.ts
PricingMolecule | errors | imports | src/molecules/PricingMolecule.ts
RiderMolecule | password | imports | src/molecules/RiderMolecule.ts
RiderMolecule | errors | imports | src/molecules/RiderMolecule.ts
UserMolecule | password | imports | src/molecules/UserMolecule.ts
UserMolecule | errors | imports | src/molecules/UserMolecule.ts
auth.routes | validate.middleware | imports | src/routes/auth.routes.ts
auth.routes | auth.schemas | imports | src/routes/auth.routes.ts
contract-signature.admin.routes | auth.middleware | imports | src/routes/contract-signature.admin.routes.ts
contract-signature.admin.routes | roleGuard.middleware | imports | src/routes/contract-signature.admin.routes.ts
contract-signature.admin.routes | validate.middleware | imports | src/routes/contract-signature.admin.routes.ts
contract-signature.admin.routes | contractSignature.schemas | imports | src/routes/contract-signature.admin.routes.ts
contract-signature.admin.routes | DocumentStorage | imports | src/routes/contract-signature.admin.routes.ts
contract-signature.admin.routes | multipartUpload | imports | src/routes/contract-signature.admin.routes.ts
contract-signature.public.routes | TokenService | imports | src/routes/contract-signature.public.routes.ts
contract-signature.public.routes | auth.middleware | imports | src/routes/contract-signature.public.routes.ts
contract-signature.public.routes | multipartUpload | imports | src/routes/contract-signature.public.routes.ts
contract-signature.public.routes | contractSignature | imports | src/routes/contract-signature.public.routes.ts
contract-signature.public.routes | errors | imports | src/routes/contract-signature.public.routes.ts
contract-signature.public.routes | ContractDocumentRepository | imports | src/routes/contract-signature.public.routes.ts
contract-signature.public.routes | DocumentStorage | imports | src/routes/contract-signature.public.routes.ts
contract.routes | auth.middleware | imports | src/routes/contract.routes.ts
contract.routes | roleGuard.middleware | imports | src/routes/contract.routes.ts
contract.routes | validate.middleware | imports | src/routes/contract.routes.ts
contract.routes | contract.schemas | imports | src/routes/contract.routes.ts
cosigner.routes | auth.middleware | imports | src/routes/cosigner.routes.ts
cosigner.routes | roleGuard.middleware | imports | src/routes/cosigner.routes.ts
cosigner.routes | validate.middleware | imports | src/routes/cosigner.routes.ts
cosigner.routes | cosigner.schemas | imports | src/routes/cosigner.routes.ts
errand.routes | auth.middleware | imports | src/routes/errand.routes.ts
errand.routes | roleGuard.middleware | imports | src/routes/errand.routes.ts
errand.routes | validate.middleware | imports | src/routes/errand.routes.ts
errand.routes | errand.schemas | imports | src/routes/errand.routes.ts
metrics.routes | MetricsMolecule | imports | src/routes/metrics.routes.ts
metrics.routes | auth.middleware | imports | src/routes/metrics.routes.ts
metrics.routes | roleGuard.middleware | imports | src/routes/metrics.routes.ts
motorcycle.routes | auth.middleware | imports | src/routes/motorcycle.routes.ts
motorcycle.routes | roleGuard.middleware | imports | src/routes/motorcycle.routes.ts
motorcycle.routes | validate.middleware | imports | src/routes/motorcycle.routes.ts
motorcycle.routes | motorcycle.schemas | imports | src/routes/motorcycle.routes.ts
notification.routes | auth.middleware | imports | src/routes/notification.routes.ts
payment.routes | auth.middleware | imports | src/routes/payment.routes.ts
payment.routes | roleGuard.middleware | imports | src/routes/payment.routes.ts
payment.routes | validate.middleware | imports | src/routes/payment.routes.ts
payment.routes | payment.schemas | imports | src/routes/payment.routes.ts
pricing.routes | auth.middleware | imports | src/routes/pricing.routes.ts
pricing.routes | roleGuard.middleware | imports | src/routes/pricing.routes.ts
pricing.routes | validate.middleware | imports | src/routes/pricing.routes.ts
pricing.routes | pricing.schemas | imports | src/routes/pricing.routes.ts
rider.routes | auth.middleware | imports | src/routes/rider.routes.ts
rider.routes | roleGuard.middleware | imports | src/routes/rider.routes.ts
rider.routes | validate.middleware | imports | src/routes/rider.routes.ts
rider.routes | rider.schemas | imports | src/routes/rider.routes.ts
user.routes | validate.middleware | imports | src/routes/user.routes.ts
user.routes | user.schemas | imports | src/routes/user.routes.ts
migrate-contract-documents-to-s3 | database | imports | src/scripts/migrate-contract-documents-to-s3.ts
migrate-contract-documents-to-s3 | ContractAuditService | injects | src/scripts/migrate-contract-documents-to-s3.ts
migrate-contract-documents-to-s3 | ContractDocumentRepository | imports | src/scripts/migrate-contract-documents-to-s3.ts
migrate-contract-documents-to-s3 | DocumentStorage | imports | src/scripts/migrate-contract-documents-to-s3.ts
migrate-contract-documents-to-s3 | DocumentStorageFactory | imports | src/scripts/migrate-contract-documents-to-s3.ts
migrate-contract-documents-to-s3 | DocumentStorageMigration | imports | src/scripts/migrate-contract-documents-to-s3.ts
seed-demo | database | imports | src/scripts/seed-demo.ts
seed-demo | password | imports | src/scripts/seed-demo.ts
seed-dev | database | imports | src/scripts/seed-dev.ts
seed-dev | password | imports | src/scripts/seed-dev.ts
App | Footer | imports | frontend/src/App.tsx
App | MobileBottomNav | imports | frontend/src/App.tsx
App | TopNav | imports | frontend/src/App.tsx
App | AuthContext | uses | frontend/src/App.tsx
App | navigation | imports | frontend/src/App.tsx
App | Home | imports | frontend/src/App.tsx
App | Login | imports | frontend/src/App.tsx
App | Register | imports | frontend/src/App.tsx
App | RegisterRider | imports | frontend/src/App.tsx
App | AdminWorkspace | imports | frontend/src/App.tsx
App | CreateCosigner | imports | frontend/src/App.tsx
App | CreatePayment | imports | frontend/src/App.tsx
App | AvailableErrands | imports | frontend/src/App.tsx
App | RiderErrands | imports | frontend/src/App.tsx
App | RiderHome | imports | frontend/src/App.tsx
App | CreateErrand | imports | frontend/src/App.tsx
App | MyErrands | imports | frontend/src/App.tsx
MobileBottomNav | AuthContext | uses | frontend/src/components/layout/MobileBottomNav.tsx
TopNav | AuthContext | uses | frontend/src/components/layout/TopNav.tsx
TopNav | useDarkMode | uses | frontend/src/components/layout/TopNav.tsx
TopNav | navigation | imports | frontend/src/components/layout/TopNav.tsx
TopNav | NotificationBell | imports | frontend/src/components/layout/TopNav.tsx
NotificationBell | useNotifications | uses | frontend/src/components/notifications/NotificationBell.tsx
NotificationBell | NotificationList | imports | frontend/src/components/notifications/NotificationBell.tsx
NotificationBell | NotificationToast | imports | frontend/src/components/notifications/NotificationBell.tsx
NotificationDropdown | NotificationList | imports | frontend/src/components/notifications/NotificationDropdown.tsx
NotificationList | NotificationListItem | imports | frontend/src/components/notifications/NotificationList.tsx
NotificationListItem | dateFormatter | imports | frontend/src/components/notifications/NotificationListItem.tsx
NotificationModal | NotificationList | imports | frontend/src/components/notifications/NotificationModal.tsx
RiderRegistrationForm | api | imports | frontend/src/components/shared/RiderRegistrationForm.tsx
RiderRegistrationForm | Button | imports | frontend/src/components/shared/RiderRegistrationForm.tsx
RiderRegistrationForm | Input | imports | frontend/src/components/shared/RiderRegistrationForm.tsx
RiderRouteActions | Button | imports | frontend/src/components/ui/RiderRouteActions.tsx
RoutePickerMapbox | Button | imports | frontend/src/components/ui/RoutePickerMapbox.tsx
AuthContext | api | imports | frontend/src/context/AuthContext.tsx
useContracts | AuthContext | uses | frontend/src/hooks/useContracts.ts
useContracts | api | imports | frontend/src/hooks/useContracts.ts
useErrands | AuthContext | uses | frontend/src/hooks/useErrands.ts
useErrands | api | imports | frontend/src/hooks/useErrands.ts
useMetrics | AuthContext | uses | frontend/src/hooks/useMetrics.ts
useMetrics | api | imports | frontend/src/hooks/useMetrics.ts
useMotorcycles | AuthContext | uses | frontend/src/hooks/useMotorcycles.ts
useMotorcycles | api | imports | frontend/src/hooks/useMotorcycles.ts
useNotifications | AuthContext | uses | frontend/src/hooks/useNotifications.ts
useNotifications | api | imports | frontend/src/hooks/useNotifications.ts
usePricingRules | AuthContext | uses | frontend/src/hooks/usePricingRules.ts
usePricingRules | api | imports | frontend/src/hooks/usePricingRules.ts
useRiders | AuthContext | uses | frontend/src/hooks/useRiders.ts
useRiders | api | imports | frontend/src/hooks/useRiders.ts
index | es | imports | frontend/src/i18n/index.ts
main | App | imports | frontend/src/main.tsx
AdminWorkspace | Motorcycles | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | Riders | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | Contracts | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | PricingRules | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | AdminErrands | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | Metrics | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | CreateMotorcycle | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | CreateRider | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | CreateContract | imports | frontend/src/pages/admin/AdminWorkspace.tsx
AdminWorkspace | CreatePricingRule | imports | frontend/src/pages/admin/AdminWorkspace.tsx
CreateCosigner | AuthContext | uses | frontend/src/pages/admin/consigners/CreateCosigner.tsx
CreateCosigner | api | imports | frontend/src/pages/admin/consigners/CreateCosigner.tsx
CreateCosigner | Button | imports | frontend/src/pages/admin/consigners/CreateCosigner.tsx
CreateCosigner | Input | imports | frontend/src/pages/admin/consigners/CreateCosigner.tsx
Contracts | useContracts | uses | frontend/src/pages/admin/contracts/Contracts.tsx
Contracts | Button | imports | frontend/src/pages/admin/contracts/Contracts.tsx
Contracts | dateFormatter | imports | frontend/src/pages/admin/contracts/Contracts.tsx
CreateContract | AuthContext | uses | frontend/src/pages/admin/contracts/CreateContract.tsx
CreateContract | api | imports | frontend/src/pages/admin/contracts/CreateContract.tsx
CreateContract | Button | imports | frontend/src/pages/admin/contracts/CreateContract.tsx
CreateContract | Input | imports | frontend/src/pages/admin/contracts/CreateContract.tsx
CreatePayment | AuthContext | uses | frontend/src/pages/admin/CreatePayment.tsx
CreatePayment | api | imports | frontend/src/pages/admin/CreatePayment.tsx
CreatePayment | Button | imports | frontend/src/pages/admin/CreatePayment.tsx
CreatePayment | Input | imports | frontend/src/pages/admin/CreatePayment.tsx
AdminErrands | Button | imports | frontend/src/pages/admin/errands/AdminErrands.tsx
AdminErrands | dateFormatter | imports | frontend/src/pages/admin/errands/AdminErrands.tsx
Metrics | useMetrics | uses | frontend/src/pages/admin/metrics/Metrics.tsx
Metrics | Card | imports | frontend/src/pages/admin/metrics/Metrics.tsx
Metrics | Button | imports | frontend/src/pages/admin/metrics/Metrics.tsx
Metrics | dateFormatter | imports | frontend/src/pages/admin/metrics/Metrics.tsx
CreateMotorcycle | AuthContext | uses | frontend/src/pages/admin/motorcycles/CreateMotorcycle.tsx
CreateMotorcycle | api | imports | frontend/src/pages/admin/motorcycles/CreateMotorcycle.tsx
CreateMotorcycle | Button | imports | frontend/src/pages/admin/motorcycles/CreateMotorcycle.tsx
CreateMotorcycle | Input | imports | frontend/src/pages/admin/motorcycles/CreateMotorcycle.tsx
Motorcycles | useMotorcycles | uses | frontend/src/pages/admin/motorcycles/Motorcycles.tsx
Motorcycles | Button | imports | frontend/src/pages/admin/motorcycles/Motorcycles.tsx
Motorcycles | dateFormatter | imports | frontend/src/pages/admin/motorcycles/Motorcycles.tsx
CreateRider | RiderRegistrationForm | imports | frontend/src/pages/admin/riders/CreateRider.tsx
Riders | useRiders | uses | frontend/src/pages/admin/riders/Riders.tsx
Riders | AuthContext | uses | frontend/src/pages/admin/riders/Riders.tsx
Riders | api | imports | frontend/src/pages/admin/riders/Riders.tsx
Riders | Button | imports | frontend/src/pages/admin/riders/Riders.tsx
Riders | dateFormatter | imports | frontend/src/pages/admin/riders/Riders.tsx
CreatePricingRule | AuthContext | uses | frontend/src/pages/admin/rules/CreatePricingRule.tsx
CreatePricingRule | api | imports | frontend/src/pages/admin/rules/CreatePricingRule.tsx
CreatePricingRule | Button | imports | frontend/src/pages/admin/rules/CreatePricingRule.tsx
CreatePricingRule | Input | imports | frontend/src/pages/admin/rules/CreatePricingRule.tsx
PricingRules | usePricingRules | uses | frontend/src/pages/admin/rules/PricingRules.tsx
PricingRules | Card | imports | frontend/src/pages/admin/rules/PricingRules.tsx
PricingRules | Button | imports | frontend/src/pages/admin/rules/PricingRules.tsx
PricingRules | dateFormatter | imports | frontend/src/pages/admin/rules/PricingRules.tsx
Login | AuthContext | uses | frontend/src/pages/auth/Login.tsx
Login | Button | imports | frontend/src/pages/auth/Login.tsx
Login | Input | imports | frontend/src/pages/auth/Login.tsx
Login | navigation | imports | frontend/src/pages/auth/Login.tsx
Register | AuthContext | uses | frontend/src/pages/auth/Register.tsx
Register | Button | imports | frontend/src/pages/auth/Register.tsx
Register | Input | imports | frontend/src/pages/auth/Register.tsx
RegisterRider | RiderRegistrationForm | imports | frontend/src/pages/auth/RegisterRider.tsx
Dashboard | AuthContext | uses | frontend/src/pages/Dashboard.tsx
Dashboard | api | imports | frontend/src/pages/Dashboard.tsx
Dashboard | Button | imports | frontend/src/pages/Dashboard.tsx
Home | Button | imports | frontend/src/pages/Home.tsx
Home | Card | imports | frontend/src/pages/Home.tsx
Home | ImageContentHome | imports | frontend/src/pages/Home.tsx
AvailableErrands | Card | imports | frontend/src/pages/rider/AvailableErrands.tsx
AvailableErrands | Button | imports | frontend/src/pages/rider/AvailableErrands.tsx
AvailableErrands | RiderRouteActions | imports | frontend/src/pages/rider/AvailableErrands.tsx
RiderErrands | Card | imports | frontend/src/pages/rider/RiderErrands.tsx
RiderErrands | Button | imports | frontend/src/pages/rider/RiderErrands.tsx
RiderErrands | RiderRouteActions | imports | frontend/src/pages/rider/RiderErrands.tsx
RiderErrands | dateFormatter | imports | frontend/src/pages/rider/RiderErrands.tsx
RiderHome | AvailableErrands | imports | frontend/src/pages/rider/RiderHome.tsx
RiderHome | RiderErrands | imports | frontend/src/pages/rider/RiderHome.tsx
CreateErrand | Button | imports | frontend/src/pages/user/CreateErrand.tsx
CreateErrand | Card | imports | frontend/src/pages/user/CreateErrand.tsx
CreateErrand | Input | imports | frontend/src/pages/user/CreateErrand.tsx
CreateErrand | RoutePickerMapbox | imports | frontend/src/pages/user/CreateErrand.tsx
MyErrands | Card | imports | frontend/src/pages/user/MyErrands.tsx
MyErrands | Button | imports | frontend/src/pages/user/MyErrands.tsx
```
