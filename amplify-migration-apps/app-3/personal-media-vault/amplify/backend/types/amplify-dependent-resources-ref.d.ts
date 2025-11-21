export type AmplifyDependentResourcesAttributes = {
  api: {
    personalmediavault: {
      GraphQLAPIEndpointOutput: 'string';
      GraphQLAPIIdOutput: 'string';
      GraphQLAPIKeyOutput: 'string';
    };
  };
  auth: {
    personalmediavaultf4856ae1: {
      AppClientID: 'string';
      AppClientIDWeb: 'string';
      HostedUIDomain: 'string';
      IdentityPoolId: 'string';
      IdentityPoolName: 'string';
      OAuthMetadata: 'string';
      UserPoolArn: 'string';
      UserPoolId: 'string';
      UserPoolName: 'string';
    };
    userPoolGroups: {
      AdminGroupRole: 'string';
      BasicGroupRole: 'string';
    };
  };
  function: {
    thumbnailgen: {
      Arn: 'string';
      LambdaExecutionRole: 'string';
      LambdaExecutionRoleArn: 'string';
      Name: 'string';
      Region: 'string';
    };
  };
  storage: {
    s3mediavault: {
      BucketName: 'string';
      Region: 'string';
    };
  };
};
