import 'package:flutter/material.dart';

void main() {
  runApp(const HoldPayApp());
}

enum AccountRole {
  buyer('Buyer'),
  seller('Seller'),
  pickupAgent('Pickup agent');

  const AccountRole(this.label);
  final String label;

  bool get needsBusinessRegistration => this != AccountRole.buyer;
}

enum KycStatus { incomplete, pendingReview, verified }

class HoldPayProfile {
  const HoldPayProfile({
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.kycStatus = KycStatus.incomplete,
  });

  final String name;
  final String email;
  final String phone;
  final AccountRole role;
  final KycStatus kycStatus;

  HoldPayProfile copyWith({KycStatus? kycStatus}) {
    return HoldPayProfile(
      name: name,
      email: email,
      phone: phone,
      role: role,
      kycStatus: kycStatus ?? this.kycStatus,
    );
  }
}

class HoldPayApp extends StatelessWidget {
  const HoldPayApp({super.key});

  static const Color forest = Color(0xFF185B45);
  static const Color paper = Color(0xFFF7F8F3);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HoldPay',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: paper,
        colorScheme: ColorScheme.fromSeed(
          seedColor: forest,
          primary: forest,
          surface: Colors.white,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE4E9E2)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE4E9E2)),
          ),
        ),
      ),
      home: const WelcomeScreen(),
    );
  }
}

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Brand(),
                  const SizedBox(height: 48),
                  const Text(
                    'Local trade,\nclearer deals.',
                    style: TextStyle(
                      fontSize: 44,
                      height: 1.04,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.8,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Discover local sellers, agree on a deal, and follow each '
                    'step to collection.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.black54,
                          height: 1.55,
                        ),
                  ),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const SignUpScreen(),
                        ),
                      ),
                      child: const Text('Create an account'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const _DemoNotice(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _areaController = TextEditingController();
  AccountRole _role = AccountRole.buyer;
  bool _isKenyanCitizen = false;
  bool _isAdult = false;
  bool _acceptedPrivacyNotice = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _areaController.dispose();
    super.dispose();
  }

  void _continue() {
    if (!_formKey.currentState!.validate()) return;
    if (!_isKenyanCitizen || !_isAdult || !_acceptedPrivacyNotice) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Confirm all eligibility and privacy items to continue.'),
        ),
      );
      return;
    }

    final profile = HoldPayProfile(
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      role: _role,
    );
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => KycScreen(profile: profile),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar:
          AppBar(title: const _Brand(), backgroundColor: Colors.transparent),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Create your account', style: _PageTitle.style),
                    const SizedBox(height: 8),
                    const Text(
                      'Website profiles stay incomplete until required KYC '
                      'is submitted and approved in the HoldPay app.',
                    ),
                    const SizedBox(height: 22),
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(labelText: 'Full name'),
                      validator: _requiredField,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration:
                          const InputDecoration(labelText: 'Email address'),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                            .hasMatch(email)) {
                          return 'Enter a valid email address.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone number',
                        hintText: '+254 7XX XXX XXX',
                      ),
                      validator: _requiredField,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<AccountRole>(
                      initialValue: _role,
                      decoration: const InputDecoration(
                        labelText: 'Account type',
                      ),
                      items: AccountRole.values
                          .map(
                            (role) => DropdownMenuItem(
                              value: role,
                              child: Text(role.label),
                            ),
                          )
                          .toList(),
                      onChanged: (role) {
                        if (role != null) setState(() => _role = role);
                      },
                    ),
                    if (_role == AccountRole.pickupAgent) ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _areaController,
                        decoration: const InputDecoration(
                          labelText: 'Agent operating area',
                          hintText: 'e.g. Nakuru town',
                        ),
                        validator: _requiredField,
                      ),
                    ],
                    const SizedBox(height: 16),
                    _ConsentTile(
                      value: _isKenyanCitizen,
                      label: 'I confirm that I am a Kenyan citizen.',
                      onChanged: (value) =>
                          setState(() => _isKenyanCitizen = value),
                    ),
                    _ConsentTile(
                      value: _isAdult,
                      label: 'I confirm that I am 18 years old or older.',
                      onChanged: (value) => setState(() => _isAdult = value),
                    ),
                    _ConsentTile(
                      value: _acceptedPrivacyNotice,
                      label:
                          'I understand my account stays pending until KYC is approved in the app.',
                      onChanged: (value) =>
                          setState(() => _acceptedPrivacyNotice = value),
                    ),
                    if (_role.needsBusinessRegistration)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: _InfoBox(
                          text: _role == AccountRole.seller
                              ? 'Seller business registration documents are '
                                  'required during in-app KYC.'
                              : 'Agent business registration documents are '
                                  'required during in-app KYC.',
                        ),
                      ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _continue,
                        child: const Text('Continue to app KYC'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const _DemoNotice(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class KycScreen extends StatefulWidget {
  const KycScreen({required this.profile, super.key});
  final HoldPayProfile profile;

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  bool _identityDocumentReady = false;
  bool _businessDocumentReady = false;
  bool _privacyConsent = false;
  bool _submitted = false;

  bool get _businessDocumentRequired =>
      widget.profile.role.needsBusinessRegistration;

  bool get _canSubmit =>
      _identityDocumentReady &&
      (!_businessDocumentRequired || _businessDocumentReady) &&
      _privacyConsent;

  void _submitDemoKyc() {
    if (!_canSubmit) return;
    setState(() => _submitted = true);
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    return Scaffold(
      appBar:
          AppBar(title: const _Brand(), backgroundColor: Colors.transparent),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _submitted ? 'Verification pending' : 'Complete app KYC',
                    style: _PageTitle.style,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _submitted
                        ? 'Your demo request is pending review. Marketplace actions remain locked until a trusted verification service approves your KYC.'
                        : 'HoldPay requires Kenyan citizenship and age 18+ for every account. Complete identity checks here in the phone app.',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${profile.name} · ${profile.role.label}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 20),
                  if (!_submitted) ...[
                    _DocumentCheck(
                      title: 'Identity document',
                      subtitle: 'National ID or passport',
                      value: _identityDocumentReady,
                      onChanged: (value) =>
                          setState(() => _identityDocumentReady = value),
                    ),
                    if (_businessDocumentRequired)
                      _DocumentCheck(
                        title: 'Business registration',
                        subtitle: 'Required for sellers and pickup agents',
                        value: _businessDocumentReady,
                        onChanged: (value) =>
                            setState(() => _businessDocumentReady = value),
                      ),
                    _ConsentTile(
                      value: _privacyConsent,
                      label:
                          'I consent to KYC processing under the app privacy notice.',
                      onChanged: (value) =>
                          setState(() => _privacyConsent = value),
                    ),
                    const SizedBox(height: 12),
                    const _InfoBox(
                      text: 'Document upload and identity verification are not '
                          'connected in this starter. Do not select or send real '
                          'documents until a secure KYC provider and backend '
                          'are integrated.',
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _canSubmit ? _submitDemoKyc : null,
                        child: const Text('Submit demo KYC request'),
                      ),
                    ),
                  ] else ...[
                    const _InfoBox(
                      text: 'This is a local demonstration only. No documents '
                          'were uploaded, no checks were performed, and no '
                          'account has been verified.',
                    ),
                  ],
                  const SizedBox(height: 14),
                  const _DemoNotice(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 17,
          backgroundColor: HoldPayApp.forest,
          child:
              Icon(Icons.verified_user_outlined, size: 19, color: Colors.white),
        ),
        SizedBox(width: 9),
        Text('HoldPay', style: TextStyle(fontWeight: FontWeight.w800)),
      ],
    );
  }
}

class _ConsentTile extends StatelessWidget {
  const _ConsentTile({
    required this.value,
    required this.label,
    required this.onChanged,
  });

  final bool value;
  final String label;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return CheckboxListTile(
      value: value,
      onChanged: (checked) => onChanged(checked ?? false),
      contentPadding: EdgeInsets.zero,
      controlAffinity: ListTileControlAffinity.leading,
      title: Text(label, style: const TextStyle(fontSize: 14)),
    );
  }
}

class _DocumentCheck extends StatelessWidget {
  const _DocumentCheck({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: CheckboxListTile(
        value: value,
        onChanged: (checked) => onChanged(checked ?? false),
        title: Text(title),
        subtitle: Text(subtitle),
        secondary: const Icon(Icons.description_outlined),
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  const _InfoBox({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E8),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Text(text, style: const TextStyle(fontSize: 13, height: 1.45)),
    );
  }
}

class _DemoNotice extends StatelessWidget {
  const _DemoNotice();

  @override
  Widget build(BuildContext context) {
    return Text(
      'Prototype only · profile data is held in app memory and is not sent to Odoo.',
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.black54,
          ),
    );
  }
}

class _PageTitle {
  static const TextStyle style = TextStyle(
    fontSize: 30,
    height: 1.1,
    fontWeight: FontWeight.w800,
    letterSpacing: -1.1,
  );
}

String? _requiredField(String? value) {
  if (value == null || value.trim().isEmpty) return 'This field is required.';
  return null;
}
