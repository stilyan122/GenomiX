using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Controllers
{
    [Route("test-email")]
    public class EmailTestController : Controller
    {
        private readonly IEmailSender _emailSender;

        public EmailTestController(IEmailSender emailSender)
        {
            _emailSender = emailSender;
        }

        [HttpGet]
        public async Task<IActionResult> Send()
        {
            await _emailSender.SendEmailAsync(
                "genomix@outlook.com",
                "GenomiX test email",
                "<h3>If you see this, SMTP works ✅</h3>");

            return Content("Sent (or tried) - check inbox/spam.");
        } 
    }
}
