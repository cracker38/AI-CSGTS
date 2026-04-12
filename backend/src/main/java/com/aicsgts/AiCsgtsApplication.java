package com.aicsgts;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Department;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.Permission;
import com.aicsgts.domain.RolePermission;
import com.aicsgts.domain.JobRole;
import com.aicsgts.domain.Skill;
import com.aicsgts.domain.RequiredSkill;
import com.aicsgts.domain.TrainingDeliveryFormat;
import com.aicsgts.domain.TrainingProgram;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.DepartmentRepository;
import com.aicsgts.repo.JobRoleRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import com.aicsgts.repo.SkillRepository;
import com.aicsgts.repo.TrainingProgramRepository;
import com.aicsgts.repo.PermissionRepository;
import com.aicsgts.repo.RolePermissionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@SpringBootApplication
@EnableScheduling
public class AiCsgtsApplication {

  public static void main(String[] args) {
    SpringApplication.run(AiCsgtsApplication.class, args);
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  /**
   * Bootstraps a default Admin for local dev. In production, remove this and create the first admin via secure provisioning.
   */
  @Bean
  CommandLineRunner bootstrapAdmin(
      AppUserRepository users,
      DepartmentRepository depts,
      PermissionRepository permissions,
      RolePermissionRepository rolePermissions,
      JobRoleRepository jobRoles,
      SkillRepository skills,
      RequiredSkillRepository requiredSkills,
      TrainingProgramRepository trainingPrograms,
      PasswordEncoder encoder
  ) {
    return args -> {
      // 1) Permissions + role mappings (idempotent)
      Map<Role, List<String>> roleToPerms = new java.util.HashMap<>();
      roleToPerms.put(Role.EMPLOYEE, List.of("EMPLOYEE_DASHBOARD", "EMPLOYEE_SKILLS"));
      roleToPerms.put(Role.MANAGER, List.of(
          "MANAGER_DASHBOARD",
          "MANAGER_PROJECT_ALLOCATE",
          "MANAGER_TRAINING_APPROVE"
      ));
      roleToPerms.put(Role.HR, List.of(
          "HR_EMPLOYEES",
          "HR_SKILL_TAXONOMY",
          "HR_TRAINING_MANAGEMENT"
      ));
      roleToPerms.put(Role.EXECUTIVE, List.of("EXECUTIVE_DASHBOARD"));

      // Admin gets everything.
      List<String> all = new java.util.ArrayList<>();
      roleToPerms.values().forEach(all::addAll);
      all.addAll(List.of(
          "ADMIN_USER_MANAGEMENT",
          "ADMIN_DEPARTMENTS",
          "ADMIN_CONFIG",
          "ADMIN_AUDIT",
          "ADMIN_IMPORT_EXPORT"
      ));
      roleToPerms.put(Role.ADMIN, all);

      for (String code : new java.util.HashSet<>(roleToPerms.values().stream().flatMap(List::stream).toList())) {
        if (permissions.findByCode(code).isEmpty()) {
          Permission p = new Permission();
          p.setCode(code);
          p.setDescription(code + " permission");
          permissions.save(p);
        }
      }

      for (var entry : roleToPerms.entrySet()) {
        Role role = entry.getKey();
        for (String code : entry.getValue()) {
          Permission perm = permissions.findByCode(code).orElse(null);
          if (perm == null) continue;

          // Check if mapping exists (query loads permission codes directly).
          boolean exists = rolePermissions.findPermissionCodesByRole(role).contains(code);
          if (!exists) {
            RolePermission rp = new RolePermission();
            rp.setRole(role);
            rp.setPermission(perm);
            rolePermissions.save(rp);
          }
        }
      }

      boolean hasUsers = users.count() > 0;

      // 2) Ensure a default IT department (for local demo).
      if (depts.count() == 0) {
        Department it = new Department();
        it.setName("IT");
        depts.save(it);
      }

      // 3) Seed a minimal skill taxonomy so employees can self-register.
      if (jobRoles.count() == 0) {
        JobRole softwareEngineer = new JobRole();
        softwareEngineer.setName("Software Engineer");
        jobRoles.save(softwareEngineer);

        Skill java = new Skill();
        java.setName("Java");
        java.setCategory("Development");
        skills.save(java);

        Skill react = new Skill();
        react.setName("React");
        react.setCategory("Development");
        skills.save(react);

        Skill mysql = new Skill();
        mysql.setName("MySQL");
        mysql.setCategory("Data & platforms");
        skills.save(mysql);

        RequiredSkill rs1 = new RequiredSkill();
        rs1.setJobRole(softwareEngineer);
        rs1.setSkill(java);
        rs1.setRequiredLevel(com.aicsgts.domain.SkillLevel.ADVANCED);
        requiredSkills.save(rs1);

        RequiredSkill rs2 = new RequiredSkill();
        rs2.setJobRole(softwareEngineer);
        rs2.setSkill(react);
        rs2.setRequiredLevel(com.aicsgts.domain.SkillLevel.INTERMEDIATE);
        requiredSkills.save(rs2);

        RequiredSkill rs3 = new RequiredSkill();
        rs3.setJobRole(softwareEngineer);
        rs3.setSkill(mysql);
        rs3.setRequiredLevel(com.aicsgts.domain.SkillLevel.INTERMEDIATE);
        requiredSkills.save(rs3);

        TrainingProgram t1 = new TrainingProgram();
        t1.setTitle("Java Advanced Workshop");
        t1.setDescription("Deep dive into advanced Java topics for production readiness.");
        t1.setSkill(java);
        t1.setTargetLevel(com.aicsgts.domain.SkillLevel.ADVANCED);
        t1.setProvider("Internal L&D");
        t1.setDeliveryFormat(TrainingDeliveryFormat.IN_PERSON);
        trainingPrograms.save(t1);

        TrainingProgram t2 = new TrainingProgram();
        t2.setTitle("React Intermediate Bootcamp");
        t2.setDescription("Build real UI features with React best practices.");
        t2.setSkill(react);
        t2.setTargetLevel(com.aicsgts.domain.SkillLevel.INTERMEDIATE);
        t2.setProvider("Udemy Business");
        t2.setDeliveryFormat(TrainingDeliveryFormat.ONLINE);
        trainingPrograms.save(t2);

        TrainingProgram t3 = new TrainingProgram();
        t3.setTitle("MySQL Optimization Lab");
        t3.setDescription("Query tuning, indexing strategy, and performance fundamentals.");
        t3.setSkill(mysql);
        t3.setTargetLevel(com.aicsgts.domain.SkillLevel.INTERMEDIATE);
        t3.setProvider("Oracle University");
        t3.setDeliveryFormat(TrainingDeliveryFormat.CERTIFICATION);
        trainingPrograms.save(t3);
      }

      // 4) Named manager account: must not use the self-service employee role (clarifies org role in UI & JWT).
      users.findByEmail("shema@gmail.com").ifPresent(u -> {
        boolean dirty = false;
        if (u.getRole() != Role.MANAGER) {
          u.setRole(Role.MANAGER);
          dirty = true;
        }
        if (!"SHEMA Patrick".equals(u.getName())) {
          u.setName("SHEMA Patrick");
          dirty = true;
        }
        if (dirty) {
          users.save(u);
        }
      });

      // 5) Create default admin only if there are no users yet.
      if (hasUsers) return;

      AppUser admin = new AppUser();
      admin.setName("System Admin");
      admin.setEmail("admin@aicsgts.local");
      admin.setPasswordHash(encoder.encode("Admin123!"));
      admin.setRole(Role.ADMIN);
      admin.setActive(true);
      admin.setDepartment(depts.findAll().stream().findFirst().orElse(null));
      admin.setJobRole(null);
      users.save(admin);
    };
  }
}

