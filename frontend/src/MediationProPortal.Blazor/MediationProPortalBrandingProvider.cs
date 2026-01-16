using Microsoft.Extensions.Localization;
using MediationProPortal.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace MediationProPortal.Blazor;

[Dependency(ReplaceServices = true)]
public class MediationProPortalBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<MediationProPortalResource> _localizer;

    public MediationProPortalBrandingProvider(IStringLocalizer<MediationProPortalResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
