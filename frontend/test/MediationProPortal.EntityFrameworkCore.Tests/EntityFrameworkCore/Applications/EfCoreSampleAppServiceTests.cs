using MediationProPortal.Samples;
using Xunit;

namespace MediationProPortal.EntityFrameworkCore.Applications;

[Collection(MediationProPortalTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<MediationProPortalEntityFrameworkCoreTestModule>
{

}
