using Volo.Abp.Modularity;

namespace MediationProPortal;

[DependsOn(
    typeof(MediationProPortalDomainModule),
    typeof(MediationProPortalTestBaseModule)
)]
public class MediationProPortalDomainTestModule : AbpModule
{

}
