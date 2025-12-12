using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Controllers
{
    [Route("dev/email")]
    public sealed class DevEmailController : Controller
    {
        private readonly IEmailSender _sender;
        public DevEmailController(IEmailSender sender) { _sender = sender; }

        [HttpGet("test")]
        public async Task<IActionResult> Test([FromQuery] string to = "demo@user.local")
        {
            try
            {
                await _sender.SendEmailAsync(to, "GenomiX SMTP OK", "<p>Mailtrap test from GenomiX.</p>");
                return Content($"Sent to {to}. Now open the GenomiX sandbox inbox.");
            }
            catch (Exception ex)
            {
                return Content("SEND FAILED: " + ex.Message);
            }
        
        }
    }
}
