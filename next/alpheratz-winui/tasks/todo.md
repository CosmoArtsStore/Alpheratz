# Alpheratz WinUI 3 Implementation Tasks

## 1. Domain & Contracts
- `[x]` Implement Value Objects (PhotoIdentity, SourceSlot, etc.)
- `[x]` Implement Entities (Photo, AppSettings, etc.)
- `[x]` Define Interfaces in Contracts (IPhotoReadRepository, etc.)

## 2. Infrastructure Layer
- `[x]` SqliteConnectionFactory & Migrator
- `[x]` SQL queries for Photo Repositories
- `[x]` SQL queries for Tag and Match Repositories
- `[x]` FileSystem services (Scanner, Cache, Backup)

## 3. Application Layer
- `[x]` Inject Dependencies to UseCases
- `[x]` Implement Photo & Gallery UseCases
- `[x]` Implement Settings & UI UseCases
- `[x]` Implement Scan / Index UseCases

## 4. Presentation Layer
- `[x]` Implement ViewModels with CommunityToolkit.Mvvm properties/commands
- `[x]` Presenter & Coordinator linkups

## 5. App & UI
- `[ ]` Build AppBootstrapper & Configure DI
- `[ ]` Design & Wire XAML pages (GalleryPage, SettingsPage, FirstRun)
- `[ ]` Setup MainWindow & ShellFrame

## 6. Verification & Review
- `[ ]` Verify new WinUI behavior parity with Alpharatz-old
- `[ ]` Request agent review
- `[ ]` Memory profile & UI validation
