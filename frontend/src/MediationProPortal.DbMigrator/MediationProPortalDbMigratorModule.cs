using MediationProPortal.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace MediationProPortal.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(MediationProPortalEntityFrameworkCoreModule),
    typeof(MediationProPortalApplicationContractsModule)
    )]
public class MediationProPortalDbMigratorModule : AbpModule
{
}
