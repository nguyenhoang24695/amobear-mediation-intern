using MediationProPortal.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace MediationProPortal.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class MediationProPortalController : AbpControllerBase
{
    protected MediationProPortalController()
    {
        LocalizationResource = typeof(MediationProPortalResource);
    }
}
