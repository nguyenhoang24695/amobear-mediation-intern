using MediationProPortal.Localization;
using Volo.Abp.AspNetCore.Components;

namespace MediationProPortal.Blazor;

public abstract class MediationProPortalComponentBase : AbpComponentBase
{
    protected MediationProPortalComponentBase()
    {
        LocalizationResource = typeof(MediationProPortalResource);
    }
}
