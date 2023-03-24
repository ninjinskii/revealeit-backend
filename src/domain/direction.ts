export enum OrthogonalDirections {
  NORTH = "NORTH",
  EAST = "EAST",
  SOUTH = "SOUTH",
  WEST = "WEST",
}

export enum DiagonalDirections {
  NORTHEAST = "NORTHEAST",
  NORTHWEST = "NORTHWEST",
  SOUTHEAST = "SOUTHEAST",
  SOUTHWEST = "SOUTHWEST",
}

const Directions = { ...OrthogonalDirections, ...DiagonalDirections };
export type Directions = typeof Directions;
