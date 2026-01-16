using Xunit;

namespace MediationProPortal.EntityFrameworkCore;

[CollectionDefinition(MediationProPortalTestConsts.CollectionDefinitionName)]
public class MediationProPortalEntityFrameworkCoreCollection : ICollectionFixture<MediationProPortalEntityFrameworkCoreFixture>
{

}
