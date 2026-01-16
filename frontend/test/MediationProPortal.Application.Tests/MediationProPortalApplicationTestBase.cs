using Volo.Abp.Modularity;

namespace MediationProPortal;

public abstract class MediationProPortalApplicationTestBase<TStartupModule> : MediationProPortalTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
