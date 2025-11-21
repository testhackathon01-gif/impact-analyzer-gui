export interface DropdownItem {
  id: number;
  name: string;
  // optional original value (repo URL) to send back to APIs when an item is selected
  url?: string;
}

export interface ApiResponse {
  data: DropdownItem[];
}