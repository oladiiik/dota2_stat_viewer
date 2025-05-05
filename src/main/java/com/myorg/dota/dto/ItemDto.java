package com.myorg.dota.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemDto {
    private int  itemId;
    private int  slotIndex;
    private String name;
    private String description;
    private String imgIcon;
}
