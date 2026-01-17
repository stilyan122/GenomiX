using GenomiX.ViewModels.Organism;

namespace GenomiX.ViewModels.Population
{
    public class PopulationViewModel
    {
        public Guid Id { get; set; }

        public List<OrganismViewModel> Organisms { get; set; } = new List<OrganismViewModel>();

        public string Name { get; set; } = null!;

        public string CreatedAt { get; set; } = null!;

        public Guid? BaseModelId { get; set; }
    }
}
