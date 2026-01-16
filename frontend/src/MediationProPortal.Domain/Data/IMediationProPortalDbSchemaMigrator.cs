using System.Threading.Tasks;

namespace MediationProPortal.Data;

public interface IMediationProPortalDbSchemaMigrator
{
    Task MigrateAsync();
}
