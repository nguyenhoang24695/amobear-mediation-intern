using System;
using System.Collections.Generic;
using System.Text;
using MediationProPortal.Localization;
using Volo.Abp.Application.Services;

namespace MediationProPortal;

/* Inherit your application services from this class.
 */
public abstract class MediationProPortalAppService : ApplicationService
{
    protected MediationProPortalAppService()
    {
        LocalizationResource = typeof(MediationProPortalResource);
    }
}
