# HoldPay mobile starter (Android + iOS)

This is a dependency-free Flutter UI starter for Android and iOS. It demonstrates role selection, eligibility declarations, the mobile-app KYC journey, and a pending-verification state. It does not upload documents, create a server account, call Odoo, process payment, or verify identity.

## Run the generated native project

Install Flutter and the platform toolchains first:

- Flutter SDK: https://docs.flutter.dev/get-started/install
- Android: Android Studio + Android SDK
- iOS: Xcode on macOS (iOS builds/signing cannot be completed on Windows)

The generated Android and iOS runners are in `holdpay_mobile_scaffold/`. From the repository root:

```powershell
Set-Location .\holdpay_mobile_scaffold
flutter pub get
flutter analyze
flutter test
flutter run
```

For Android, run on an Android emulator/device. For iOS, open/run on a Mac with Xcode. Flutter builds one Dart codebase for both platforms while producing separate native runners.

The iOS runner is generated, but this Windows environment cannot build, sign, or run it; use Xcode on macOS. The generated Android application ID is still Flutter's example ID and must be changed to a domain you control before distribution.

## Current screens

1. Welcome
2. Account creation with buyer, seller, and pickup-agent roles
3. In-app KYC requirements and demo pending-review state

Seller and pickup-agent accounts see an additional business-registration requirement. Buyer, seller, and agent eligibility declarations are UI-only; the app performs no real KYC checks.

## Odoo connection still to implement

The current Odoo addon has no mobile API endpoints. The app currently keeps profile state in memory and clearly marks the experience as a demo. To connect it:

1. Add authenticated Odoo/API endpoints for mobile signup, secure KYC-provider session creation, and verification status retrieval.
2. Use a server-side provider integration for identity/business-document upload and verification. Never send identity documents to ordinary Odoo website routes or store them unencrypted.
3. Return a backend-controlled account status such as `pending_mobile_app`, `pending_review`, `verified`, or `rejected`.
4. Unlock website and mobile marketplace actions only after the backend reports `verified`; never trust a status sent by the app.
5. Add secure token lifecycle, abuse controls, audit logging, privacy notices, retention/deletion, and error handling.

Do not use real identity documents with this starter. A production KYC flow requires a reviewed provider, backend, and data-protection design.
