using GenomiX.Common.Extensions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace GenomiX
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var connectionString = builder.Configuration
                .GetConnectionString("DefaultConnection") ?? 
                throw new InvalidOperationException("Connection string not found.");

            builder.Services
                .AddDatabaseDeveloperPageExceptionFilter()
                .AddGenomixDBServices(connectionString)
                .AddGenomixAppServices(builder.Configuration)
                .AddAuthenticationServices(builder.Configuration);

            builder.Services.AddLocalizationServices();

            builder.Services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(AppContext.BaseDirectory, "dp_keys")))
            .SetApplicationName("GenomiX");

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseMigrationsEndPoint();
            }
            else
            {
                app.UseExceptionHandler("/Error/500");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.Localize();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseStatusCodePagesWithReExecute("/Error/{0}");

            app.MapStaticAssets();
            app.MapRazorPages();
            app.MapAppRoutes();

            await app.UseKnownIdentityPasswordsAsync();

            app.Run();
        }
    }
}
