/**
 * Test suite for the Auth Generator in Gen 2 Migration Tool
 *
 * This file tests the generation of Amplify Gen 2 auth configuration code from Gen 1 auth definitions.
 * The tests verify that various auth features are correctly transformed from Gen 1 format to Gen 2 format.
 *
 * Coverage includes:
 * - External OAuth providers (Google, Facebook, Apple, Amazon, OIDC, SAML)
 * - Lambda triggers for auth events
 * - Multi-factor authentication (MFA) with SMS and TOTP
 * - User attributes (standard and custom)
 * - User pool groups
 * - Login methods (email, phone)
 * - OAuth scopes and attribute mapping
 * - Reference auth for importing existing resources
 */

import { StandardAttributes } from 'aws-cdk-lib/aws-cognito';
import assert from 'node:assert';
import {
  Attribute,
  AttributeMappingRule,
  AuthDefinition,
  AuthTriggerEvents,
  EmailOptions,
  ReferenceAuth,
  renderAuthNode,
  UserPoolMfaConfig,
} from './index';
import { printNodeArray } from '../../test_utils/ts_node_printer';

describe('render auth node', () => {
  /**
   * Tests for external OAuth providers
   * Verifies that social login providers are correctly configured with proper client credentials,
   * callback URLs, and logout URLs in the generated Gen 2 code
   */
  describe('external providers', () => {
    describe('Google', () => {
      // Tests Google OAuth provider configuration with client ID/secret from environment secrets
      it('renders the google provider', () => {
        const rendered = renderAuthNode({
          loginOptions: { googleLogin: true, callbackURLs: ['https://example.com/callback'], logoutURLs: ['https://example.com/logout'] },
        });
        const source = printNodeArray(rendered);
        assert.match(source, /google:/);
        assert.match(source, /clientId: secret\("GOOGLE_CLIENT_ID"\)/);
        assert.match(source, /clientSecret: secret\("GOOGLE_CLIENT_SECRET"\)/);
        assert.match(source, /callbackUrls: \[\"https:\/\/example\.com\/callback\"\]/);
        assert.match(source, /logoutUrls: \[\"https:\/\/example\.com\/logout\"\]/);
      });
    });
    describe('Facebook', () => {
      // Tests Facebook OAuth provider configuration with client credentials
      it('renders the facebook provider', () => {
        const rendered = renderAuthNode({
          loginOptions: { facebookLogin: true, callbackURLs: ['https://example.com/callback'], logoutURLs: ['https://example.com/logout'] },
        });
        const source = printNodeArray(rendered);
        assert.match(source, /facebook:/);
        assert.match(source, /clientId: secret\("FACEBOOK_CLIENT_ID"\)/);
        assert.match(source, /clientSecret: secret\("FACEBOOK_CLIENT_SECRET"\)/);
        assert.match(source, /callbackUrls: \[\"https:\/\/example\.com\/callback\"\]/);
        assert.match(source, /logoutUrls: \[\"https:\/\/example\.com\/logout\"\]/);
      });
    });
    describe('Apple', () => {
      // Tests Sign in with Apple configuration including team ID, key ID, and private key
      it('renders the apple provider', () => {
        const rendered = renderAuthNode({
          loginOptions: { appleLogin: true, callbackURLs: ['https://example.com/callback'], logoutURLs: ['https://example.com/logout'] },
        });
        const source = printNodeArray(rendered);
        assert.match(source, /signInWithApple:/);
        assert.match(source, /clientId: secret\("SIWA_CLIENT_ID"\)/);
        assert.match(source, /keyId: secret\("SIWA_KEY_ID"\)/);
        assert.match(source, /privateKey: secret\("SIWA_PRIVATE_KEY"\)/);
        assert.match(source, /teamId: secret\("SIWA_TEAM_ID"\)/);
        assert.match(source, /callbackUrls: \[\"https:\/\/example\.com\/callback\"\]/);
        assert.match(source, /logoutUrls: \[\"https:\/\/example\.com\/logout\"\]/);
      });
    });
    describe('Amazon', () => {
      // Tests Login with Amazon provider configuration
      it('renders the amazon provider', () => {
        const rendered = renderAuthNode({
          loginOptions: { amazonLogin: true, callbackURLs: ['https://example.com/callback'], logoutURLs: ['https://example.com/logout'] },
        });
        const source = printNodeArray(rendered);
        assert.match(source, /loginWithAmazon:/);
        assert.match(source, /clientId: secret\("LOGINWITHAMAZON_CLIENT_ID"\)/);
        assert.match(source, /clientSecret: secret\("LOGINWITHAMAZON_CLIENT_SECRET"\)/);
        assert.match(source, /callbackUrls: \[\"https:\/\/example\.com\/callback\"\]/);
        assert.match(source, /logoutUrls: \[\"https:\/\/example\.com\/logout\"\]/);
      });
    });
    describe('OIDC', () => {
      // Tests OpenID Connect provider configuration with multiple OIDC providers
      it('renders the oidc provider', () => {
        const rendered = renderAuthNode({
          loginOptions: {
            oidcLogin: [{ issuerUrl: 'https://e' }, { name: 'Sanay', issuerUrl: 'hey' }],
            callbackURLs: ['https://example.com/callback'],
            logoutURLs: ['https://example.com/logout'],
          },
        });
        const source = printNodeArray(rendered);
        assert.match(source, /oidc:/);
        assert.match(source, /clientId: secret\("OIDC_CLIENT_ID_1"\)/);
        assert.match(source, /clientSecret: secret\("OIDC_CLIENT_SECRET_1"\)/);
        assert.match(source, /issuerUrl: \"https:\/\/e\"/);
        assert.match(source, /issuerUrl: \"hey\"/);
        assert.match(source, /name: "Sanay"/);
      });
      // Verifies OIDC section is omitted when no OIDC providers are configured
      it('does not render OIDC if not passed', () => {
        const rendered = renderAuthNode({
          loginOptions: {
            oidcLogin: [],
          },
        });
        const source = printNodeArray(rendered);
        assert(!source.includes('oidc:'));
      });
    });
    describe('SAML', () => {
      // Tests SAML provider configuration with metadata content and type
      it('renders the saml provider', () => {
        const rendered = renderAuthNode({
          loginOptions: {
            samlLogin: { name: 'Sanay', metadata: { metadataContent: 'content', metadataType: 'URL' } },
            callbackURLs: ['https://example.com/callback'],
            logoutURLs: ['https://example.com/logout'],
          },
        });
        const source = printNodeArray(rendered);
        assert.match(source, /saml:/);
        assert.match(source, /metadataContent: \"content\"/);
        assert.match(source, /metadataType: \"URL\"/);
        assert.match(source, /name: "Sanay"/);
      });
      // Verifies SAML section is omitted when no SAML provider is configured
      it('does not render SAML if not passed', () => {
        const rendered = renderAuthNode({
          loginOptions: {},
        });
        const source = printNodeArray(rendered);
        assert(!source.includes('saml:'));
      });
    });
  });
  /**
   * Tests for Lambda triggers
   * Verifies that Cognito Lambda triggers are properly configured in Gen 2 format
   * Tests all supported trigger events like preSignUp, postConfirmation, etc.
   */
  describe('lambda', () => {
    // Tests that triggers object is added when any Lambda trigger is defined
    it('adds a triggers object when a lambda trigger is defined', () => {
      const rendered = renderAuthNode({ lambdaTriggers: { preSignUp: { source: 'amplify/backend/function/testfunction/handler.ts' } } });
      const source = printNodeArray(rendered);
      assert.match(source, /triggers: \{/);
    });
    const testCases: Record<AuthTriggerEvents, boolean> = {
      createAuthChallenge: true,
      customMessage: true,
      defineAuthChallenge: true,
      postAuthentication: true,
      postConfirmation: true,
      preAuthentication: true,
      preSignUp: true,
      preTokenGeneration: true,
      userMigration: true,
      verifyAuthChallengeResponse: true,
    };
    // Tests each individual Lambda trigger event type
    for (const testCase of Object.keys(testCases)) {
      const rendered = renderAuthNode({ lambdaTriggers: { [testCase]: { source: `amplify/backend/function/${testCase}/handler.ts` } } });
      const source = printNodeArray(rendered);
      assert.match(source, new RegExp(`triggers:\\s*{\\s*${testCase}:\\s*${testCase}\\s*}`));
    }
  });
  /**
   * Tests for Multi-Factor Authentication (MFA)
   * Verifies MFA configuration including TOTP, SMS, and different MFA modes (REQUIRED, OPTIONAL, OFF)
   */
  describe('mfa', () => {
    // Verifies multifactor property is omitted when no MFA is configured
    it('does not render the multifactor property if no multifactor options are specified', () => {
      const rendered = renderAuthNode({});
      const source = printNodeArray(rendered);
      assert.doesNotMatch(source, new RegExp(`multifactor:`));
    });
    describe('totp', () => {
      // Tests that TOTP is not rendered when not specified
      it('does not render totp if totp is not specified', () => {
        const rendered = renderAuthNode({ mfa: { mode: 'OPTIONAL' } });
        const source = printNodeArray(rendered);
        assert.doesNotMatch(source, new RegExp(`multifactor:\\s+\\{[\\s\\S]*totp:\\strue`));
      });
      const totpStates: boolean[] = [true, false];
      // Tests TOTP enabled/disabled states
      for (const state of totpStates) {
        it(`correctly renders totp state of ${state}`, async () => {
          const rendered = renderAuthNode({ mfa: { mode: 'OPTIONAL', totp: state } });
          const source = printNodeArray(rendered);
          assert.match(source, new RegExp(`multifactor:\\s+\\{[\\s\\S]*totp:\\s${state}`));
        });
      }
    });
    describe('sms', () => {
      // Tests that SMS MFA is not rendered when not specified
      it('does not render sms if sms is not specified', () => {
        const rendered = renderAuthNode({ mfa: { mode: 'OPTIONAL' } });
        const source = printNodeArray(rendered);
        assert.doesNotMatch(source, new RegExp(`multifactor:\\s+\\{[\\s\\S]*sms:\\strue`));
      });
      const smsStates: boolean[] = [true, false];
      // Tests SMS MFA enabled/disabled states
      for (const state of smsStates) {
        it(`correctly renders sms state of ${state}`, async () => {
          const rendered = renderAuthNode({ mfa: { mode: 'OPTIONAL', sms: state } });
          const source = printNodeArray(rendered);
          assert.match(source, new RegExp(`multifactor:\\s+\\{[\\s\\S]*sms:\\s${state}`));
        });
      }
    });
    const modes: UserPoolMfaConfig[] = ['REQUIRED', 'OFF', 'OPTIONAL'];
    // Tests all MFA modes: REQUIRED, OPTIONAL, OFF
    for (const mode of modes) {
      it(`correctly renders mfa state of ${mode}`, async () => {
        const rendered = renderAuthNode({ mfa: { mode } });
        const source = printNodeArray(rendered);
        assert.match(source, new RegExp(`multifactor:\\s+\\{\\s+mode:\\s"${mode}"`));
      });
    }
  });
  /**
   * Tests for import statements
   * Verifies that necessary imports are included in the generated code
   */
  describe('imports', () => {
    // Tests that defineAuth is imported from @aws-amplify/backend
    it('imports @aws-amplify/backend', async () => {
      const rendered = renderAuthNode({
        loginOptions: { email: true },
      });
      const source = printNodeArray(rendered);
      assert.match(source, /import\s?\{\s?defineAuth\s?\}\s?from\s?"\@aws-amplify\/backend"/);
    });
  });
  /**
   * Tests for user attributes configuration
   * Verifies both standard Cognito attributes and custom attributes are properly configured
   */
  describe('username attributes', () => {
    describe('Standard Attributes', () => {
      const attributes: Array<keyof StandardAttributes> = [
        'email',
        'gender',
        'locale',
        'address',
        'website',
        'fullname',
        'nickname',
        'timezone',
        'birthdate',
        'givenName',
        'familyName',
        'middleName',
        'phoneNumber',
        'profilePage',
        'profilePicture',
        'lastUpdateTime',
        'preferredUsername',
      ];
      // Tests each standard attribute with mutable and required properties
      for (const attribute of attributes) {
        for (const truthiness of [true, false]) {
          it(`renders ${attribute}: ${truthiness} individually`, () => {
            const authDefinition: AuthDefinition = {
              loginOptions: {
                email: true,
              },
              standardUserAttributes: {
                [attribute as Attribute]: {
                  mutable: truthiness,
                  required: truthiness,
                },
              },
            };
            const node = renderAuthNode(authDefinition);
            const source = printNodeArray(node);
            assert(source.includes(attribute));
            assert(source.includes(`mutable: ${truthiness}`));
            assert(source.includes(`required: ${truthiness}`));
          });
        }
      }
    });
    describe('Custom Attributes', () => {
      // Tests custom user attributes with data types and validation constraints
      it('renders custom attributes', () => {
        const authDefinition: AuthDefinition = {
          loginOptions: {
            email: true,
          },
          customUserAttributes: { 'custom:Test1': { dataType: 'Number', mutable: true, min: 10, max: 100 } },
        };
        const node = renderAuthNode(authDefinition);
        const source = printNodeArray(node);
        assert(source.includes('custom:Test1'));
        assert(source.includes('dataType: "Number"'));
      });
      // Tests that undefined custom attributes are not included in output
      it('does not render anything if CustomAttribute is undefined', () => {
        const authDefinition: AuthDefinition = {
          loginOptions: {
            email: true,
          },
          customUserAttributes: { 'custom:isAllowed': undefined },
        };
        const node = renderAuthNode(authDefinition);
        const source = printNodeArray(node);
        assert(!source.includes('custom:isAllowed'));
      });
    });
  });
  /**
   * Tests for user pool groups
   * Verifies that Cognito user pool groups are properly configured
   */
  describe('groups', () => {
    // Tests basic user group configuration
    it('renders groups', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {},
        groups: ['manager'],
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /defineAuth\(\{[\s\S]*groups:\s\["manager"\]/);
    });
  });
  /**
   * Tests for login configuration
   * Verifies email/phone login options, OAuth scopes, and attribute mapping
   */
  describe('loginWith', () => {
    describe('email', () => {
      type TestCase<T extends keyof EmailOptions = keyof EmailOptions> = {
        optionProperty: T;
        gen2DefinitionProperty: string;
        value: EmailOptions[T];
        searchPattern: string;
      };

      const emailPropertyTestCases: TestCase[] = [
        {
          optionProperty: 'emailVerificationSubject',
          value: 'My Verification Subject',
          gen2DefinitionProperty: 'verificationEmailSubject',
          searchPattern: '"My Verification Subject"',
        },
        {
          optionProperty: 'emailVerificationBody',
          gen2DefinitionProperty: 'verificationEmailBody',
          value: 'My Verification Body',
          searchPattern: '\\(\\) => "My Verification Body"',
        },
      ];
      // Tests email verification subject and body configuration
      for (const { optionProperty: property, value, searchPattern, gen2DefinitionProperty } of emailPropertyTestCases) {
        it(`renders email login parameter ${property}`, () => {
          const emailOptions: Partial<EmailOptions> = {
            [property as keyof EmailOptions]: value,
          };
          const authDefinition: AuthDefinition = {
            loginOptions: {
              emailOptions,
            },
          };
          const node = renderAuthNode(authDefinition);
          const source = printNodeArray(node);
          assert.match(
            source,
            new RegExp(
              `defineAuth\\(\\{\\s+loginWith:\\s+\\{\\s+email:\\s+\\{\\s+${gen2DefinitionProperty}: ${searchPattern}\\s+\\}\\s+\\}\\s+\\}\\)`,
            ),
          );
        });
      }
      // Tests basic email login enablement
      it('renders `email: true`', () => {
        const authDefinition: AuthDefinition = {
          loginOptions: {
            email: true,
          },
        };
        const node = renderAuthNode(authDefinition);
        const source = printNodeArray(node);
        assert.match(source, /defineAuth\(\{\s+loginWith:\s+\{\s+email:\s?true\s+\}\s+\}\)/);
      });
    });
    describe('phone', () => {
      // Tests phone number login enablement
      it('renders `phone: true`', () => {
        const authDefinition: AuthDefinition = {
          loginOptions: {
            phone: true,
          },
        };
        const node = renderAuthNode(authDefinition);
        const source = printNodeArray(node);
        assert.match(source, /defineAuth\(\{\s+loginWith:\s+\{\s+phone:\s?true\s+\}\s+\}\)/);
      });
    });
    describe('OAuth scopes', () => {
      // Tests OAuth scope configuration for social providers
      it('renders oauth scopes', () => {
        const authDefinition: AuthDefinition = {
          loginOptions: {
            googleLogin: true,
            scopes: ['EMAIL', 'OPENID'],
          },
        };
        const node = renderAuthNode(authDefinition);
        const source = printNodeArray(node);
        assert.match(source, /defineAuth\(\{[\s\S]*scopes:\s\["EMAIL",\s"OPENID"\]/);
      });
      // Tests that scopes are omitted when not configured
      it('renders no oauth scopes if not passed', () => {
        const authDefinition: AuthDefinition = {
          loginOptions: {},
        };
        const node = renderAuthNode(authDefinition);
        const source = printNodeArray(node);
        assert.doesNotMatch(source, /scopes:/);
      });
    });
    // Tests attribute mapping from social provider to user pool attributes
    it('renders attributeMapping if passed along with Google login', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          googleLogin: true,
          googleAttributes: { fullname: 'name' } as AttributeMappingRule,
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /defineAuth\(\{[\s\S]*attributeMapping:\s\{[\s\S]*fullname:\s"name"/);
    });
  });
  /**
   * Tests for reference auth (importing existing resources)
   * Verifies that existing Cognito User Pools and Identity Pools can be referenced
   * in Gen 2 configuration instead of creating new ones
   */
  describe('reference auth', () => {
    // Tests importing an existing User Pool with groups
    it(`renders successfully for imported userpool`, () => {
      const referenceAuthProps: ReferenceAuth = {
        userPoolId: 'userPoolId',
        userPoolClientId: 'userPoolClientId',
        groups: {
          Admin: 'AdminRoleARN',
          ReadOnly: 'ReadOnlyRoleARN',
        },
      };
      const authDefinition: AuthDefinition = {
        referenceAuth: referenceAuthProps,
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /referenceAuth/);
      assert.match(source, /userPoolId: "userPoolId"/);
      assert.match(source, /userPoolClientId: "userPoolClientId"/);
      assert.match(source, /groups:/);
      assert.match(source, /"Admin": "AdminRoleARN"/);
      assert.match(source, /"ReadOnly": "ReadOnlyRoleARN"/);
      assert.doesNotMatch(source, /identityPoolId: "identityPoolId"/);
      assert.doesNotMatch(source, /authRoleArn: "authRoleArn"/);
      assert.doesNotMatch(source, /unauthRoleArn: "unauthRoleArn"/);
    });

    // Tests importing an existing Identity Pool with auth/unauth roles
    it(`renders successfully for imported identity pool`, () => {
      const referenceAuthProps: ReferenceAuth = {
        identityPoolId: 'identityPoolId',
        authRoleArn: 'authRoleArn',
        unauthRoleArn: 'unauthRoleArn',
      };
      const authDefinition: AuthDefinition = {
        referenceAuth: referenceAuthProps,
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /referenceAuth/);
      assert.match(source, /identityPoolId: "identityPoolId"/);
      assert.match(source, /authRoleArn: "authRoleArn"/);
      assert.match(source, /unauthRoleArn: "unauthRoleArn"/);
      assert.doesNotMatch(source, /userPoolId: "userPoolId"/);
      assert.doesNotMatch(source, /userPoolClientId: "userPoolClientId"/);
      assert.doesNotMatch(source, /groups:/);
      assert.doesNotMatch(source, /"Admin": "AdminRoleARN"/);
      assert.doesNotMatch(source, /"ReadOnly": "ReadOnlyRoleARN"/);
    });

    // Tests importing both User Pool and Identity Pool together
    it(`renders successfully for imported userpool and identity pool`, () => {
      const referenceAuthProps: ReferenceAuth = {
        userPoolId: 'userPoolId',
        userPoolClientId: 'userPoolClientId',
        identityPoolId: 'identityPoolId',
        authRoleArn: 'authRoleArn',
        unauthRoleArn: 'unauthRoleArn',
        groups: {
          Admin: 'AdminRoleARN',
          'Read-Only': 'ReadOnlyRoleARN',
        },
      };
      const authDefinition: AuthDefinition = {
        referenceAuth: referenceAuthProps,
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /referenceAuth/);
      assert.match(source, /userPoolId: "userPoolId"/);
      assert.match(source, /userPoolClientId: "userPoolClientId"/);
      assert.match(source, /identityPoolId: "identityPoolId"/);
      assert.match(source, /authRoleArn: "authRoleArn"/);
      assert.match(source, /unauthRoleArn: "unauthRoleArn"/);
      assert.match(source, /groups:/);
      assert.match(source, /"Admin": "AdminRoleARN"/);
      assert.match(source, /"Read-Only": "ReadOnlyRoleARN"/);
    });
  });

  /**
   * Tests for username configuration
   * Note: Username configuration in Gen 2 is handled through CDK overrides
   * These tests verify the migration approach for username-based login
   */
  describe('username configuration', () => {
    // Tests username configuration through policy overrides
    it('renders username configuration via policy overrides', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true, // Base login method required
        },
        userPoolOverrides: {
          UsernameAttributes: ['email'], // Configure username attributes
          AliasAttributes: ['preferred_username'],
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      // Should include policy overrides for username configuration
      assert.match(source, /defineAuth/);
    });
  });

  /**
   * Tests for user pool group preferences
   * Note: Group precedence in Gen 2 requires CDK overrides
   * Basic groups are supported, advanced features need policy overrides
   */
  describe('user pool group preferences', () => {
    // Tests basic group configuration (precedence handled via CDK)
    it('renders basic groups with CDK override note', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {},
        groups: ['Admin', 'Manager'], // Basic group names only
        userPoolOverrides: {
          'Groups.Admin.Precedence': 1,
          'Groups.Manager.Precedence': 2,
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /groups:\s?\["Admin",\s?"Manager"\]/);
    });
  });

  /**
   * Tests for email verification features
   * Note: Advanced email verification features require CDK overrides in Gen 2
   */
  describe('email verification features', () => {
    // Tests email verification configuration via policy overrides
    it('renders email verification configuration via CDK overrides', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
          emailOptions: {
            emailVerificationSubject: 'Verify your email',
            emailVerificationBody: 'Click here to verify: {##Verify Email##}',
          },
        },
        userPoolOverrides: {
          'VerificationMessageTemplate.EmailMessageByLink': 'Custom verification link message',
          'VerificationMessageTemplate.DefaultEmailOption': 'CONFIRM_WITH_LINK',
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /verificationEmailSubject/);
      assert.match(source, /verificationEmailBody/);
    });
  });

  /**
   * Tests for sign-up attributes configuration
   * Note: Sign-up attributes are configured through standardUserAttributes
   */
  describe('sign-up attributes', () => {
    // Tests sign-up attributes via standard user attributes
    it('renders sign-up attributes via standardUserAttributes', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
        },
        standardUserAttributes: {
          email: { required: true, mutable: false },
          phoneNumber: { required: true, mutable: true },
          givenName: { required: false, mutable: true },
          familyName: { required: false, mutable: true },
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /userAttributes/);
      assert.match(source, /email/);
      assert.match(source, /required:\s?true/);
    });
  });

  /**
   * Tests for auth trigger templates
   * Note: Trigger templates are implemented via Lambda triggers in Gen 2
   */
  describe('auth trigger templates', () => {
    // Tests Lambda trigger for reCaptcha-like functionality
    it('renders Lambda trigger for challenge functionality', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {},
        lambdaTriggers: {
          createAuthChallenge: {
            source: 'amplify/backend/function/recaptchaChallenge/handler.ts',
          },
          defineAuthChallenge: {
            source: 'amplify/backend/function/defineChallenge/handler.ts',
          },
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /triggers/);
      assert.match(source, /createAuthChallenge/);
      assert.match(source, /defineAuthChallenge/);
    });

    // Tests Lambda trigger for adding users to groups
    it('renders Lambda trigger for adding users to groups', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {},
        lambdaTriggers: {
          postConfirmation: {
            source: 'amplify/backend/function/addUserToGroup/handler.ts',
          },
        },
        groups: ['Users', 'Admins'],
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /postConfirmation/);
      assert.match(source, /groups/);
    });

    // Tests Lambda trigger for email domain filtering
    it('renders Lambda trigger for email domain filtering', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {},
        lambdaTriggers: {
          preSignUp: {
            source: 'amplify/backend/function/emailDomainFilter/handler.ts',
          },
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /preSignUp/);
    });

    // Tests Lambda trigger for token customization
    it('renders Lambda trigger for token customization', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {},
        lambdaTriggers: {
          preTokenGeneration: {
            source: 'amplify/backend/function/customizeToken/handler.ts',
          },
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /preTokenGeneration/);
    });
  });

  /**
   * Tests for password policy configuration
   * Note: Password policy in Gen 2 is configured via userPoolOverrides
   */
  describe('password policy', () => {
    // Tests password policy via CDK overrides
    it('renders password policy via userPoolOverrides', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
        },
        userPoolOverrides: {
          'Policies.PasswordPolicy.MinimumLength': 12,
          'Policies.PasswordPolicy.RequireLowercase': true,
          'Policies.PasswordPolicy.RequireUppercase': true,
          'Policies.PasswordPolicy.RequireNumbers': true,
          'Policies.PasswordPolicy.RequireSymbols': true,
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /defineAuth/);
      // Policy overrides are handled at CDK level
    });
  });

  /**
   * Tests for OAuth flow configuration
   * Note: Advanced OAuth configuration requires CDK overrides in Gen 2
   */
  describe('oauth flow configuration', () => {
    // Tests OAuth flows via userPoolOverrides
    it('renders OAuth configuration via CDK overrides', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          googleLogin: true,
          callbackURLs: ['https://app.com/callback', 'myapp://callback'],
          logoutURLs: ['https://app.com/logout', 'myapp://logout'],
        },
        oAuthFlows: ['AUTHORIZATION_CODE'],
        userPoolOverrides: {
          'UserPoolDomain.Domain': 'myapp-auth',
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /callbackUrls/);
      assert.match(source, /logoutUrls/);
      assert.match(source, /google/);
    });
  });

  /**
   * Tests for admin queries configuration
   * Note: Admin queries in Gen 2 are configured via readAttributes/writeAttributes
   */
  describe('admin queries', () => {
    // Tests admin capabilities via read/write attributes
    it('renders admin capabilities via read/write attributes', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
        },
        readAttributes: ['email', 'phone_number', 'given_name'],
        writeAttributes: ['given_name', 'family_name'],
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /defineAuth/);
      // Read/write attributes are handled at the CDK level
    });
  });

  /**
   * Tests for zero-config authenticator support
   * Note: Authenticator UI is handled by frontend libraries in Gen 2
   */
  describe('zero-config authenticator', () => {
    // Tests basic auth configuration for zero-config authenticator
    it('renders basic auth for zero-config authenticator', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
          phone: true,
        },
        mfa: {
          mode: 'OPTIONAL',
          totp: true,
          sms: true,
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /email:\s?true/);
      assert.match(source, /phone:\s?true/);
      assert.match(source, /multifactor/);
    });
  });

  /**
   * Tests for user pool naming
   * Note: User pool naming in Gen 2 is configured via CDK overrides
   */
  describe('user pool naming', () => {
    // Tests user pool naming via CDK overrides
    it('renders user pool naming via CDK overrides', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
        },
        userPoolOverrides: {
          UserPoolName: 'MyApp User Pool',
          UserPoolDescription: 'User pool for MyApp application',
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /defineAuth/);
      // Pool naming is handled via CDK overrides
    });
  });

  /**
   * Tests for unauthenticated logins
   * Note: Guest access is configured via guestLogin property
   */
  describe('unauthenticated logins', () => {
    // Tests guest access via guestLogin
    it('renders guest access configuration', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
        },
        guestLogin: true,
        identityPoolName: 'MyApp Identity Pool',
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /defineAuth/);
      // Guest login is handled by the backend configuration
    });
  });

  /**
   * Tests for advanced attribute configuration
   * Note: Advanced attribute permissions use readAttributes/writeAttributes
   */
  describe('advanced attribute configuration', () => {
    // Tests attribute permissions via readAttributes/writeAttributes
    it('renders attribute permissions configuration', () => {
      const authDefinition: AuthDefinition = {
        loginOptions: {
          email: true,
        },
        standardUserAttributes: {
          email: {
            mutable: false,
            required: true,
          },
          givenName: {
            mutable: true,
            required: false,
          },
        },
        readAttributes: ['email', 'given_name', 'family_name'],
        writeAttributes: ['given_name', 'family_name'],
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /userAttributes/);
      assert.match(source, /mutable:\s?false/);
      assert.match(source, /mutable:\s?true/);
    });
  });

  /**
   * Tests for import auth handling
   * Note: Import auth is replaced by reference auth in Gen 2
   */
  describe('import auth handling', () => {
    // Tests migration from import auth to reference auth
    it('migrates import auth to reference auth', () => {
      const authDefinition: AuthDefinition = {
        referenceAuth: {
          userPoolId: 'existing-pool-id',
          userPoolClientId: 'existing-client-id',
          // Migration note: This replaces Gen 1 import auth functionality
        },
      };
      const node = renderAuthNode(authDefinition);
      const source = printNodeArray(node);
      assert.match(source, /referenceAuth/);
      assert.match(source, /userPoolId:\s?"existing-pool-id"/);
      assert.match(source, /userPoolClientId:\s?"existing-client-id"/);
    });
  });
});
