namespace GenomiX.ViewModels.Organism
{
    public class OrganismViewModel
    {
        public Guid Id { get; set; }

        public string SimpleName { get; set; } = "";
        public string ScientificName { get; set; } = "";

        public string Status { get; set; } = "alive";

        public double SurvivalScore { get; set; } = 1.0;

        public string Species { get; set; } = "mouse";
    }
}
