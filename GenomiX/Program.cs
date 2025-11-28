using Genomix.Common.Extensions;
using GenomiX.Common.Extensions;
using Microsoft.EntityFrameworkCore;
using GenomiX.Infrastructure;
using Microsoft.AspNetCore.Identity;

namespace GenomiX
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var connectionString = builder.Configuration
                .GetConnectionString("ApplicationDbContextConnection") ?? 
                throw new InvalidOperationException("Connection string not found.");

            builder.Services
                .AddDatabaseDeveloperPageExceptionFilter()
                .AddGenomixDBServices(connectionString)
                .AddGenomixAppServices();

            builder.Services.AddRazorPages();
           
            builder.Services.AddControllersWithViews();

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseMigrationsEndPoint();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapStaticAssets();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}")
                .WithStaticAssets();

            app.MapRazorPages()
               .WithStaticAssets();

            await app.UseKnownIdentityPasswordsAsync();

            app.Run();
        }
    }
}
