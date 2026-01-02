using Microsoft.AspNetCore.Mvc.Rendering;

namespace GenomiX.Areas.Identity.Pages.Account.Manage
{
    public static class ManageNavPages
    {
        public static string Index => "Index";
        public static string Email => "Email";
        public static string ChangePassword => "ChangePassword";
        public static string SetPassword => "SetPassword";
        public static string Roles => "Roles";
        public static string RoleRequests => "RoleRequests";

        public static string? IndexNavClass(ViewContext viewContext) => PageNavClass(viewContext, Index);
        public static string? EmailNavClass(ViewContext viewContext) => PageNavClass(viewContext, Email);
        public static string? ChangePasswordNavClass(ViewContext viewContext) => PageNavClass(viewContext, ChangePassword);
        public static string? SetPasswordNavClass(ViewContext viewContext) => PageNavClass(viewContext, SetPassword);

        public static string? RolesNavClass(ViewContext vc) => PageNavClass(vc, Roles);
        public static string? RoleRequestsNavClass(ViewContext vc) => PageNavClass(vc, RoleRequests);
        public static string? PageNavClass(ViewContext viewContext, string page)
        {
            var activePage = viewContext.ViewData["ActivePage"] as string
                             ?? Path.GetFileNameWithoutExtension(viewContext.ActionDescriptor.DisplayName);

            return string.Equals(activePage, page, StringComparison.OrdinalIgnoreCase) ? "active" : null;
        }
    }
}
