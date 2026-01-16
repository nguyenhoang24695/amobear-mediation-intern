using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace MediationProPortal.Data;

/* This is used if database provider does't define
 * IMediationProPortalDbSchemaMigrator implementation.
 */
public class NullMediationProPortalDbSchemaMigrator : IMediationProPortalDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
