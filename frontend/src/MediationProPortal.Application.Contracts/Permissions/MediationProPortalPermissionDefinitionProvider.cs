using MediationProPortal.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace MediationProPortal.Permissions;

public class MediationProPortalPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(MediationProPortalPermissions.GroupName);
        //Define your own permissions here. Example:
        //myGroup.AddPermission(MediationProPortalPermissions.MyPermission1, L("Permission:MyPermission1"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<MediationProPortalResource>(name);
    }
}
