import 'package:flutter_test/flutter_test.dart';
import 'package:holdpay_mobile/main.dart';

void main() {
  testWidgets('shows HoldPay welcome and starts signup', (tester) async {
    await tester.pumpWidget(const HoldPayApp());

    expect(find.text('Local trade,\nclearer deals.'), findsOneWidget);
    await tester.tap(find.text('Create an account'));
    await tester.pumpAndSettle();

    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('Account type'), findsOneWidget);
  });
}
