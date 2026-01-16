using MediationProPortal.Samples;
using Xunit;

namespace MediationProPortal.EntityFrameworkCore.Domains;

[Collection(MediationProPortalTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<MediationProPortalEntityFrameworkCoreTestModule>
{

}
