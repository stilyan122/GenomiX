using NUnit.Framework;

namespace GenomiX.Tests.Services
{
    [SetUpFixture]
    public sealed class TestBootstrap
    {
        [OneTimeSetUp]
        public void Init()
        {
            Environment.SetEnvironmentVariable("GENOMIX_SKIP_DB_CONFIG", "1");
        }
    }
}
