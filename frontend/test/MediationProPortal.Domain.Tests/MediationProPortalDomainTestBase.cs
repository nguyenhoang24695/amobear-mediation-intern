using Volo.Abp.Modularity;

namespace MediationProPortal;

/* Inherit from this class for your domain layer tests. */
public abstract class MediationProPortalDomainTestBase<TStartupModule> : MediationProPortalTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
