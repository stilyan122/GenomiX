using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Controllers
{
    public class ErrorController : Controller
    {
        private static readonly Dictionary<int, string> Views = new()
    {
        { 400, "BadRequest" },
        { 401, "Unauthorized" },
        { 403, "Forbidden" },
        { 404, "NotFound" },
        { 422, "Validation" },
        { 429, "TooManyRequests" },
        { 503, "ServiceUnavailable" },
        { 500, "ServerError" }
    };

        [Route("Error/{code}")]
        public IActionResult Index(int code)
        {
            var viewName = Views.ContainsKey(code)
                ? Views[code]
                : "ServerError";

            return View($"~/Views/Shared/Error/{viewName}.cshtml");
        }
    }
}
