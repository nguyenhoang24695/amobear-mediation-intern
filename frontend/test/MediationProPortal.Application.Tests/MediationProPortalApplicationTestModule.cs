using Volo.Abp.Modularity;

namespace MediationProPortal;

[DependsOn(
    typeof(MediationProPortalApplicationModule),
    typeof(MediationProPortalDomainTestModule)
)]
public class MediationProPortalApplicationTestModule : AbpModule
{

}
