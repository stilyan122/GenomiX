namespace GenomiX.ViewModels.Simulation
{
    public class SaveStateRequest
    {
        public List<OrgStateItem> Organisms { get; set; } = new();

        public class OrgStateItem
        {
            public Guid Id { get; set; }
            public string Status { get; set; } = "alive";
            public double Fitness { get; set; }
        }
    }
}
