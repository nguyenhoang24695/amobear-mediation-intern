using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MediationProPortal.Data;
using Volo.Abp.DependencyInjection;

namespace MediationProPortal.EntityFrameworkCore;

public class EntityFrameworkCoreMediationProPortalDbSchemaMigrator
    : IMediationProPortalDbSchemaMigrator, ITransientDependency
{
    private readonly IServiceProvider _serviceProvider;

    public EntityFrameworkCoreMediationProPortalDbSchemaMigrator(
        IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task MigrateAsync()
    {
        /* We intentionally resolve the MediationProPortalDbContext
         * from IServiceProvider (instead of directly injecting it)
         * to properly get the connection string of the current tenant in the
         * current scope.
         */

        await _serviceProvider
            .GetRequiredService<MediationProPortalDbContext>()
            .Database
            .MigrateAsync();
    }
}
