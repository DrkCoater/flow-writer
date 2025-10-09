use regex::Regex;
use std::collections::HashMap;
use crate::models::{Variable, Section};

pub fn build_variable_map(variables: &[Variable]) -> HashMap<String, String> {
    variables.iter()
        .map(|v| (v.name.clone(), v.value.clone()))
        .collect()
}

pub fn resolve_variables(content: &str, variables: &HashMap<String, String>) -> String {
    let re = Regex::new(r"\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}").unwrap();

    re.replace_all(content, |caps: &regex::Captures| {
        let var_name = &caps[1];
        variables.get(var_name)
            .map(|v| v.clone())
            .unwrap_or_else(|| caps[0].to_string())  // Keep original if variable not found
    }).to_string()
}

pub fn resolve_section_tree(sections: &mut [Section], var_map: &HashMap<String, String>) {
    for section in sections.iter_mut() {
        section.content = resolve_variables(&section.content, var_map);
        if !section.children.is_empty() {
            resolve_section_tree(&mut section.children, var_map);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_variable_map() {
        let variables = vec![
            Variable {
                name: "userName".to_string(),
                value: "Jeremy".to_string(),
            },
            Variable {
                name: "goal".to_string(),
                value: "Ship v1".to_string(),
            },
        ];

        let map = build_variable_map(&variables);

        assert_eq!(map.get("userName"), Some(&"Jeremy".to_string()));
        assert_eq!(map.get("goal"), Some(&"Ship v1".to_string()));
        assert_eq!(map.len(), 2);
    }

    #[test]
    fn test_resolve_variables_simple() {
        let mut vars = HashMap::new();
        vars.insert("userName".to_string(), "Jeremy".to_string());

        let content = "Hello ${userName}!";
        let result = resolve_variables(content, &vars);

        assert_eq!(result, "Hello Jeremy!");
    }

    #[test]
    fn test_resolve_variables_multiple() {
        let mut vars = HashMap::new();
        vars.insert("goal".to_string(), "Ship v1".to_string());
        vars.insert("deadline".to_string(), "2025-11-01".to_string());

        let content = "We aim to ${goal} by ${deadline}";
        let result = resolve_variables(content, &vars);

        assert_eq!(result, "We aim to Ship v1 by 2025-11-01");
    }

    #[test]
    fn test_resolve_variables_with_markdown() {
        let mut vars = HashMap::new();
        vars.insert("goal".to_string(), "Ship v1".to_string());

        let content = "# Goal\n\nWe aim to **${goal}**";
        let result = resolve_variables(content, &vars);

        assert_eq!(result, "# Goal\n\nWe aim to **Ship v1**");
    }

    #[test]
    fn test_resolve_variables_missing() {
        let vars = HashMap::new();

        let content = "Hello ${missingVar}!";
        let result = resolve_variables(content, &vars);

        // Should keep original when variable not found
        assert_eq!(result, "Hello ${missingVar}!");
    }

    #[test]
    fn test_resolve_variables_no_variables() {
        let vars = HashMap::new();

        let content = "No variables here";
        let result = resolve_variables(content, &vars);

        assert_eq!(result, "No variables here");
    }

    #[test]
    fn test_resolve_section_tree_single() {
        let mut vars = HashMap::new();
        vars.insert("userName".to_string(), "Jeremy".to_string());

        let mut sections = vec![
            Section {
                id: "test-1".to_string(),
                section_type: "test".to_string(),
                content: "Hello ${userName}".to_string(),
                ref_target: None,
                children: vec![],
            }
        ];

        resolve_section_tree(&mut sections, &vars);

        assert_eq!(sections[0].content, "Hello Jeremy");
    }

    #[test]
    fn test_resolve_section_tree_with_children() {
        let mut vars = HashMap::new();
        vars.insert("goal".to_string(), "Ship v1".to_string());

        let mut sections = vec![
            Section {
                id: "parent-1".to_string(),
                section_type: "process".to_string(),
                content: "Goal: ${goal}".to_string(),
                ref_target: None,
                children: vec![
                    Section {
                        id: "child-1".to_string(),
                        section_type: "alternatives".to_string(),
                        content: "For ${goal}".to_string(),
                        ref_target: None,
                        children: vec![],
                    }
                ],
            }
        ];

        resolve_section_tree(&mut sections, &vars);

        assert_eq!(sections[0].content, "Goal: Ship v1");
        assert_eq!(sections[0].children[0].content, "For Ship v1");
    }
}
