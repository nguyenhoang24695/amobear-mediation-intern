using System.Threading.Tasks;
using MediationProPortal.Localization;
using MediationProPortal.MultiTenancy;
using Volo.Abp.Identity.Blazor;
using Volo.Abp.SettingManagement.Blazor.Menus;
using Volo.Abp.TenantManagement.Blazor.Navigation;
using Volo.Abp.UI.Navigation;

namespace MediationProPortal.Blazor.Menus;

public class MediationProPortalMenuContributor : IMenuContributor
{
    public async Task ConfigureMenuAsync(MenuConfigurationContext context)
    {
        if (context.Menu.Name == StandardMenus.Main)
        {
            await ConfigureMainMenuAsync(context);
        }
    }

    private Task ConfigureMainMenuAsync(MenuConfigurationContext context)
    {
        var administration = context.Menu.GetAdministration();
        var l = context.GetLocalizer<MediationProPortalResource>();

        // Main menu items
        context.Menu.Items.Insert(
            0,
            new ApplicationMenuItem(
                MediationProPortalMenus.Home,
                l["Menu:Home"],
                "/",
                icon: "fas fa-home",
                order: 0
            )
        );

        context.Menu.Items.Insert(
            1,
            new ApplicationMenuItem(
                MediationProPortalMenus.Dashboard,
                l["Menu:Dashboard"],
                "/dashboard",
                icon: "fas fa-chart-line",
                order: 1
            )
        );

        context.Menu.Items.Insert(
            2,
            new ApplicationMenuItem(
                MediationProPortalMenus.Apps,
                l["Menu:Apps"],
                "/apps",
                icon: "fas fa-mobile-alt",
                order: 2
            )
        );

        context.Menu.Items.Insert(
            3,
            new ApplicationMenuItem(
                MediationProPortalMenus.MediationGroups,
                l["Menu:MediationGroups"],
                "/mediation-groups",
                icon: "fas fa-layer-group",
                order: 3
            )
        );

        context.Menu.Items.Insert(
            4,
            new ApplicationMenuItem(
                MediationProPortalMenus.Reports,
                l["Menu:Reports"],
                "/reports",
                icon: "fas fa-file-chart-line",
                order: 4
            )
        );

        if (MultiTenancyConsts.IsEnabled)
        {
            administration.SetSubItemOrder(TenantManagementMenuNames.GroupName, 1);
        }
        else
        {
            administration.TryRemoveMenuItem(TenantManagementMenuNames.GroupName);
        }

        administration.SetSubItemOrder(IdentityMenuNames.GroupName, 2);
        administration.SetSubItemOrder(SettingManagementMenus.GroupName, 3);

        return Task.CompletedTask;
    }
}
